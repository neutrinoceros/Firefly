import os
import itertools

import numpy as np

from .octree import octant_offsets
from .json_utils import load_from_json,write_to_json
from .binary_writer import RawBinaryWriter


class OctNodeStream(object):
    def __repr__(self):
        return f"OctNodeStream({self.name}):{self.nparts:d} points - {self.nfields:d} fields"
        
    def __init__(
        self,
        center,
        width,
        nfields,
        name:str='',
        weight_index=None,
        **kwargs):

        self.center = center
        self.width = width
        self.nfields = nfields

        self.name = name

        self.weight_index = weight_index

        ## accumulator attributes
        self.nparts:int = 0
        self.velocity = np.zeros(3)
        self.rgba_color = np.zeros(4)
        self.fields = np.zeros(nfields)

        ## buffers which will be flushed if max_npart_per_node is crossed
        self.buffer_coordss:list = []
        self.buffer_velss:list = []
        self.buffer_rgba_colorss:list = []
        self.buffer_fieldss:list = []
        self.buffer_size:int = 0

        self.children = []

        self.extra_dict = kwargs
 
    def set_buffers_from_dict(
        self,
        data_dict,
        target_directory=None):
 
        keys = list(data_dict.keys())
        if 'x' not in keys: raise KeyError(f"Data dict missing coordinates {keys}")

        velss = None
        rgba_colorss = None

        has_velocity = False
        has_color = False

        nparts = data_dict['x'].shape[0]
        coordss = np.zeros((nparts,3))
        for i,axis in enumerate(['x','y','z']):
            coordss[:,i] = data_dict.pop(axis)
            key = 'v'+axis
            if key in keys: 
                if velss is None: 
                    velss = np.zeros((nparts,3))
                    has_velocity = True
                velss[:,i] = data_dict.pop(key)

        for i,color in enumerate(['r','g','b','a']):
            key = f'rgba_{color}'
            if key in keys: 
                if rgba_colorss is None:
                    has_color = True
                    rgba_colorss = np.zeros((nparts,4))
                rgba_colorss[:,i] = data_dict.pop(key)

        ## determine field names from remaining keys
        field_names = list(data_dict.keys())
        fieldss = np.zeros((nparts,len(field_names)))
        for i,field_name in enumerate(field_names):
            fieldss[:,i] = data_dict.pop(field_name)

        width = np.max(coordss.max(axis=0) - coordss.min(axis=0))
 
        self.set_buffers_from_arrays(
            np.zeros(3),#center,
            width,
            coordss,
            fieldss,
            field_names,
            velss,
            rgba_colorss)
        
        root_dict = {}

        root_dict = {'field_names':field_names,
            'has_velocity':has_velocity,
            'has_color':has_color,
            'weight_index':self.weight_index,
            'nodes':{}}

        if target_directory is not None:
            root_dict['nodes'][self.name] = self.write(target_directory)
            write_to_json(root_dict,os.path.join(target_directory,'octree.json'))
        
        return root_dict
    
    def set_buffers_from_arrays(
        self,
        center,
        width,
        coordss,
        fieldss,
        these_field_names,
        velss=None,
        rgba_colorss=None):

        global field_names
        field_names = these_field_names

        global prefixes
        prefixes = ['x','y','z'] 

        self.nfields = fieldss.shape[1]+6

        self.buffer_coordss = coordss
        self.buffer_fieldss = np.zeros((coordss.shape[0],self.nfields))
        self.buffer_fieldss[:,:-6] = fieldss

        self.center = center
        self.width = width

        self.fields = np.zeros(self.nfields)

        self.nparts = coordss.shape[0]
        self.buffer_size = coordss.shape[0]

        for i in range(3):
            self.buffer_fieldss[:,-6+i] = coordss[:,i]
            self.buffer_fieldss[:,-3+i] = (coordss[:,i]**2)
 
        if self.weight_index is not None:
            weights = self.buffer_fieldss[:,self.weight_index]
            for i in range(self.nfields):
                if i != self.weight_index:
                    self.buffer_fieldss[:,i]*=weights

            weights = weights[:,None] ## for broadcasting below
        else: weights = 1

        if velss is not None:
            self.buffer_velss = velss * weights
            self.velocity = np.sum(self.buffer_velss,axis=0)

            prefixes+=['vx','vy','vz']

        if rgba_colorss is not None:
            self.buffer_rgba_colorss = rgba_colorss * weights
            self.rgba_color = np.sum(self.buffer_rgba_colorss,axis=0)
            prefixes+=['rgba_r','rgba_g','rgba_b','rgba_a']
        
        prefixes+=field_names 

    def accumulate(
        self,
        point:np.ndarray,
        fields:np.ndarray,
        velocity:np.ndarray=None,
        rgba_color:np.ndarray=None,
        ):

        ## okay we're allowed to hold the raw data here
        ##  store coordinate data in the buffer
        self.buffer_coordss += [point]

        if velocity is not None: self.buffer_velss += [velocity]
        if rgba_color is not None: self.buffer_rgba_colorss += [rgba_color]

        ## store field data in the buffer
        self.buffer_fieldss += [fields]

        ## accumulate the point
        self.nparts += 1
        self.buffer_size += 1

        if velocity is not None: self.velocity += velocity
        if rgba_color is not None: self.rgba_color += rgba_color

        self.fields += fields
                
    def write(self,top_level_directory,bytes_per_file=4e7):

        this_dir = os.path.join(top_level_directory)
        if not os.path.isdir(this_dir): os.makedirs(this_dir)

        global field_names
        namestr = f'{self.name}_' if self.name != '' else ''

        ## determine how many files we'll need to split this dataset into
        nsub_files = int(4*self.buffer_size/bytes_per_file)+1
        try: counts = [arr.shape[0] for arr in np.array_split(np.arange(self.buffer_size),nsub_files)]
        except: 
            print(self)
            import pdb; pdb.set_trace()
            raise

        ## ------ gather buffer arrays to be written to disk
        coordss = np.array(self.buffer_coordss).reshape(self.buffer_size,3)
        del self.buffer_coordss
        buffers = [coordss[:,0],coordss[:,1],coordss[:,2]]

        velss = np.array(self.buffer_velss).reshape(-1,3)
        del self.buffer_velss
        if velss.shape[0] > 0:
            buffers += [velss[:,0],velss[:,1],velss[:,2]]

        rgba_colorss = np.array(self.buffer_rgba_colorss).reshape(-1,4)
        del self.buffer_rgba_colorss
        if rgba_colorss.shape[0] > 0:
            buffers += [rgba_colorss[:,0],rgba_colorss[:,1],rgba_colorss[:,2],rgba_colorss[:,2]]

        fieldss = np.array(self.buffer_fieldss).reshape(self.buffer_size,-1)[:,:-6]
        del self.buffer_fieldss
        if fieldss.shape[0] > 0:
            for i in range(len(field_names)): 
                if self.weight_index is None or i == self.weight_index:
                    weight = 1
                else: weight = fieldss[:,self.weight_index]
                buffers += [fieldss[:,i]/weight]
        ## --------------------------------------------------

        ## write each buffer to however many subfiles we need to 
        ##  ensure a maximum file-size on disk
        files = []
        count_offset = 0
        for index,count in enumerate(counts):
            for prefix,buffer in zip(prefixes,buffers):
                fname = os.path.join(top_level_directory,f"{namestr}{prefix}.{index}.ffraw")
                RawBinaryWriter(fname,buffer[count_offset:count_offset+count]).write()

                ## append to file list
                files += [(fname,0,count*4)]

            count_offset+=count

        ## format aggregate data into a dictionary
        node_dict = self.format_node_dictionary()

        ## append buffer files
        node_dict['files'] = files

        return node_dict

    def format_node_dictionary(self):
        """
        '':{
        'name':'',
        'files':fnames,
        'width':dmax,
        'center':np.zeros(3),
        'nparts':np.sum(nparts),
        'children':[],
        'radius':radius,
        'center_of_mass':com
        }
        """
        node_dict = {}

        node_dict['center'] = self.center
        ## set basic keys
        for key in ['width','name','nparts','children']: node_dict[key] = getattr(self,key)


        ## divide out weight for accumulated fields
        if self.weight_index is not None: 
            weight = self.fields[self.weight_index]
        else: weight = self.nparts

        ## set other accumulated field values, use the same weight
        for i,field_key in enumerate(field_names):
            if self.weight_index is None or i != self.weight_index: 
                self.fields[i]/=weight
            node_dict[field_key] = self.fields[i]

        ## excluded from loop above because not in field names
        com = self.fields[-6:-3]/weight ## last 3 fields will always be xcom, ycom, zcom
        com_sq = self.fields[-3:]/weight ## last 3 fields will always be xcom^2, ycom^2, zcom^2
        ## sigma_x = <x^2>_m - <x>_m^2, take average over 3 axes to get 1d
        ##  sigma to represent 1-sigma extent of particles in node
        node_dict['radius'] = np.sqrt(np.mean(com_sq-com**2))
        node_dict['center_of_mass'] = com

        if 'vx' in prefixes: vcom = self.velocity/weight
        else: vcom = None
        node_dict['com_velocity'] = vcom
        
        if 'rgba_r' in prefixes: rgba_color = self.rgba_color/weight
        else: rgba_color = None
        node_dict['rgba_color'] = rgba_color

        return node_dict

    def sort_point_into_child(
        self,
        nodes,
        point,
        fields,
        velocity,
        rgba_color):

        ## use 3 bit binary number to index
        ##  the octants-- for each element of the array 
        ##  it is either to the left or right of the center.
        ##  this determines which octant it lives in
        ##  thanks Mike Grudic for this idea!
        octant_index = 0
        for axis in range(3): 
            if point[axis] > self.center[axis]: octant_index+= (1 << axis)
        child_name = self.name+'%d'%(octant_index)

        if child_name not in nodes: 
            ## create a new node! welcome to the party, happy birthday, etc.
            child = OctNodeStream(
                center=self.center + self.width*octant_offsets[octant_index],
                width=self.width/2,
                nfields=self.nfields,
                name=child_name)
            nodes[child_name] = child
            self.children += [child_name]
        else: child:OctNodeStream = nodes[child_name]

        child.accumulate(point,fields,velocity,rgba_color)

class OctreeStream(object):

    def __repr__(self):
        return f"OctreeStream({len(self.expand_nodes)}/{len(self.root['nodes'])})"

    def __init__(self,pathh,min_to_refine=1e6):
        """ pathh is path to data that has already been saved to .ffraw format and has an acompanying octree.json """
        ## gotsta point us to an octree my friend
        if not os.path.isdir(pathh): raise IOError(pathh)

        self.pathh = pathh
        self.min_to_refine = min_to_refine

        ## read octree summary file
        self.root = load_from_json(os.path.join(pathh,'octree.json'))

        nodes = self.root['nodes']

        global prefixes
        prefixes = (['x','y','z'] + 
            ['vx','vy','vz']*self.root['has_velocity'] + 
            ['rgba_r','rgba_g','rgba_b','rgba_a']*self.root['has_color'] + 
            self.root['field_names'])

        self.expand_nodes = [node for node in nodes.values() if 'files' in node.keys() and node['nparts'] > self.min_to_refine]
        print([expand_node['name'] for expand_node in self.expand_nodes],'need to be refined')

    def refine(self,use_mps=False):

        if not use_mps:
            new_dicts = [refineNode(node,self.pathh,self.root['weight_index']) for node in self.expand_nodes]
        else: raise NotImplementedError()

        for old_node,new_nodes in zip(self.expand_nodes,new_dicts):
            print('replacing:',old_node['name'])
            new_node,children = new_nodes[0],new_nodes[1:]

            self.root['nodes'][old_node['name']] = new_node
            for child in children: self.root['nodes'][child['name']] = child

            ## delete the old files now that nothing is pointing to them
            for fname in old_node['files']: os.remove(fname[0])

        write_to_json(self.root,os.path.join(self.pathh,'octree.json'))

        ## update nodes which need to be refined
        self.expand_nodes = [node for node in self.root['nodes'].values() if 'files' in node.keys() and node['nparts'] > self.min_to_refine]
        print([expand_node['name'] for expand_node in self.expand_nodes],'still need to be refined')
    
    def full_refine(self):

        while len(self.expand_nodes) >0:
            print(self)
            self.refine()

def refineNode(node_dict,target_directory,weight_index):

    print('refining:',node_dict['name'])
    
    global field_names
    ## load the node from all the split binary files
    ##  note that fieldss will have 6 extra columns for CoM calculation
    coordinates,velocities,rgba_colors,fieldss,field_names = loadNodeFromDisk(
        ## TODO should have a loop here that only passes the number of particles
        ##  we can hold in memory
        node_dict['files'],
        node_dict['nparts'])
    
    ## for calculating the center of mass and 1 sigma extent of the node
    if weight_index is not None: weight = fieldss[:,weight_index]
    else: weight = 1

    for i in range(3):
        fieldss[:,-6+i] = coordinates[:,i]
        fieldss[:,-3+i] = (coordinates[:,i]**2)
    
    if weight_index is not None: raise NotImplementedError(
        "need to multiply fields, velocities, and rgba_colors by weight")

    this_node = OctNodeStream(
        node_dict['center'],
        node_dict['width'],
        len(field_names)+6,
        node_dict['name'])
    
    nodes = {}
    end = coordinates.shape[0]
    print('building...')
    for i,(point,fields) in enumerate(zip(coordinates,fieldss)):
        #if not (i % 10000): print("%.2f"%(i/end*100)+"%",end='\t') 
        this_node.sort_point_into_child(
            nodes,
            point,
            fields,
            velocities[i] if velocities is not None else None,
            rgba_colors[i] if rgba_colors is not None else None)
        this_node.nparts+=1
    print('done!')

    ## format accumulated values into a dictionary
    this_node_dict = this_node.format_node_dictionary()
   
    return [this_node_dict]+[child.write(target_directory,1e6*4) for child in nodes.values()]


def loadNodeFromDisk(files,nparts):
    indices = []
    for fname in files: 
        split = os.path.basename(fname[0]).split('.')
        if len(split) != 3: raise IOError("bad .ffraw file name, must be field.<i>.ffraw")
        if split[0] == prefixes[0] and split[2] == 'ffraw': indices += [int(split[1])]
    
    non_field_names = ['x','y','z'] + ['vx','vy','vz'] + ['rgba_r','rgba_g','rgba_b','rgba_a'] 

    has_velocity = 'vx' in prefixes
    has_color = 'rgba_r' in prefixes
    field_names = [prefix for prefix in prefixes if prefix not in non_field_names]

    coordinates = np.empty((nparts,3))
    buffers = [coordinates[:,0],coordinates[:,1],coordinates[:,2]]
    velocities = None
    if has_velocity: 
        velocities = np.empty((nparts,3)) 
        buffers += [velocities[:,0],velocities[:,1],velocities[:,2]]
    rgba_colors = None
    if has_color:
        rgba_colors = np.empty((nparts,4)) 
        buffers += [rgba_colors[:,0],rgba_colors[:,1],rgba_colors[:,2],rgba_colors[:,2]]

    fieldss = np.empty((nparts,len(field_names)+6)) 
    for i in range(len(field_names)+6):
        buffers += [fieldss[:,i]]

    count_offset = 0
    for index in indices:
        for prefix,buffer in zip(
            prefixes,
            buffers):
            for fname in files:
                fname,byte_offset,byte_size = fname
                count = int(byte_size/4) - 1 ## -1 because the header is integer=nparts
                short_fname = os.path.basename(fname)
                if short_fname == f"{prefix}.{index}.ffraw":
                    RawBinaryWriter(fname,buffer[count_offset:count_offset+count]).read(byte_offset,count)
        count_offset+=count
    
    return coordinates,velocities,rgba_colors,fieldss,field_names