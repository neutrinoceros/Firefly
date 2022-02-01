///////////////////////////////
////// create the UI
//////////////////////////////
function createUI(){
	console.log("Creating UI", GUIParams.partsKeys, GUIParams.decimate);

	//first get the maximum width of the particle type labels
	var longestPartLabel = '';
	GUIParams.longestPartLabelLen = 0;

	GUIParams.partsKeys.forEach(function(p,i){
		if (p.length > longestPartLabel.length) longestPartLabel = p;
		if (i == GUIParams.partsKeys.length - 1){
			var elem = d3.select('body').append('div')
				.attr('class','pLabelDivCHECK')
				.text(longestPartLabel)
			GUIParams.longestPartLabelLen = elem.node().clientWidth;
			elem.remove();
		}
	});
	GUIParams.longestPartLabelLen = Math.max(50, GUIParams.longestPartLabelLen); //50 is our default length
	if (GUIParams.longestPartLabelLen > 50){
		GUIParams.containerWidth += (GUIParams.longestPartLabelLen - 50);
	}

//change the hamburger to the X to start
	window.addEventListener('mouseup',function(){GUIParams.movingUI = false;});

	var UIcontainer = d3.select('.UIcontainer');
	UIcontainer.classed('hidden', true); //hide to start
	UIcontainer.html(""); //start fresh
	d3.select('#colorbar_container').classed('hidden', true);

	UIcontainer.attr('style','position:absolute; top:10px; left:10px; width:'+GUIParams.containerWidth+'px');

	var UIt = UIcontainer.append('div')
		.attr('class','UItopbar')
		.attr('id','UItopbar')
		.attr('onmouseup','hideUI(this);')
		.attr('onmousedown','dragElement(this, event);');

	//UIt.append('table');
	var UIr1 = UIt.append('tr');
	var UIc1 = UIr1.append('td')
		.style('padding-left','5px')
		.attr('id','Hamburger')
	UIc1.append('div').attr('class','bar1');
	UIc1.append('div').attr('class','bar2');
	UIc1.append('div').attr('class','bar3');
	var UIc2 = UIr1.append('td').append('div')
		.attr('id','ControlsText')
		.style('font-size','16pt')
		.style('padding-left','5px')
		.style('top','6px')
		.style('position','absolute')
		.append('b').text('Controls');

	var hider = UIcontainer.append('div').attr('id','UIhider');
	hider.append('div').attr('id','particleUI');


	//set the gtoggle Object (in correct order)
	GUIParams.gtoggle = {};
	GUIParams.gtoggle.dataControls = true;
	GUIParams.gtoggle.cameraControls = true;
	GUIParams.partsKeys.forEach(function(p){
		GUIParams.gtoggle[p] = true;

	})

	var UI = d3.select('#particleUI')

	// create first controls pane containing:
	//  fulscreen button
	//  take snapshot button
	//  save settings button
	//  default settings button
	//  load settings button
	//  load new data button
	createDataControlsBox(UI);

	// create second controls pane containing:
	//  camera center (camera focus) text boxes
	//  camera location text boxes
	//  camera rotation text boxes
	//  save, reset, and recenter buttons
	//  friction and stereo separation sliders
	//  stereo checkbox
	createCameraControlBox(UI);

	// initially hide the colorbar, this is overwritten if showCmap is true
	//  for any particle group
	d3.select('#colorbar_container').classed('hidden', true);

	// create each of the particle group UI panels containing:
	//  on-off toggle
	//  particle size slider
	//  color picker
	//  velocity vector checkbox/type selector
	//  colormap selector, slider, checkbox
	//  filter selecter, slider, checkbox
	//  playback checkbox
	createParticleUIs(UI);
	
	// resize a bit post-facto
	d3.selectAll('.sp-replacer').style('left',(GUIParams.containerWidth - 60) + 'px');
	
	if (GUIParams.containerWidth > 300) {
		//could be nice to center these, but there are lots of built in positions for the sliders and input boxes.  Not worth it
		var pd = 0.//(GUIParams.containerWidth - 300)/2.;
		d3.selectAll('.dropdown-content')
			.style('width',(GUIParams.containerWidth - 10 - pd) + 'px')
			//.style('padding-left',pd + 'px')
	}

	// particle groups
	createPsizeSliders();
	createNpartsSliders();
	if (GUIParams.haveAnyOctree) createCamNormSliders();

	// create all the noUISliders
	// data controls
	createDecimationSlider();
	if (GUIParams.haveAnyOctree) createMemorySlider();

	// camera controls
	createStereoSlider();
	createFrictionSlider();

	// particle group dropdowns
	createVelWidthSliders();
	createFilterSliders();
	createColormapSliders();

	// update the text boxes for camera
	updateUICenterText();
	updateUICameraText();
	updateUIRotText();

	// tell the viewer the UI has been initialized
	sendToViewer([{'applyUIoptions':null}]);
	sendToViewer([{'setViewerParamByKey':[true, "haveUI"]}]);

	// collapse the UI initially
	var hamburger = document.getElementById('UItopbar');
	hideUI(hamburger);
	hamburger.classList.toggle("change");	

	// and now reveal the result
	UIcontainer.classed('hidden', false);
}

function createDataControlsBox(UI){
	////////////////////////
	//generic dropdown for "data" controls"
	var m1 = UI.append('div')
		.attr('id','dataControlsDiv')
		.attr('class','particleDiv')
		.style('width', (GUIParams.containerWidth - 20) + 'px')
	m1.append('div')
		.attr('class','pLabelDiv')
		.style('width', '215px')
		.text('Data Controls')
	m1.append('button')
		.attr('class','dropbtn')
		.attr('id','dataControlsDropbtn')
		.attr('onclick','expandDropdown(this);')
		.style('left',(GUIParams.containerWidth - 40) + 'px')
		.html('&#x25BC');
	var m2 = m1.append('div')
		.attr('class','dropdown-content')
		.attr('id','dataControlsDropdown')
	var m2height = 220;

	//decimation
	var dec = m2.append('div')
		.attr('id', 'decimationDiv')
		.style('width','270px')
		.style('margin-left','5px')
		.style('margin-top','10px')
		.style('display','inline-block')
	dec.append('div')
		.attr('class','pLabelDiv')
		.style('width','85px')
		.style('display','inline-block')
		.text('Decimation');
	dec.append('div')
		.attr('class','NSliderClass')
		.attr('id','DSlider')
		.style('margin-left','40px')
		.style('width','158px');
	dec.append('input')
		.attr('class','NMaxTClass')
		.attr('id','DMaxT')
		.attr('type','text')
		.style('left','255px')
		.style('width','30px');
	if (GUIParams.haveAnyOctree){
		m2height += 50;
		//text to show the memory-imposed decimation
		m2.append('div')
			.attr('id', 'decimationOctreeDiv')
			.style('width','270px')
			.style('margin-left','5px')
			.style('margin-top','10px')
			.style('display','inline-block')
			.append('div')
				.attr('class','pLabelDiv')
				.style('width','270px')
				.style('display','inline-block')
				.style('font-size','12px')
				.text('Octree memory-imposed decimation = ')
				.append('span')
					.attr('id','decimationOctreeSpan')
					.text('1.0');

		//slider to controls the memory limit
		var mem = m2.append('div')
			.attr('id', 'memoryDiv')
			.style('width','270px')
			.style('margin-left','5px')
			.style('margin-top','10px')
			.style('display','inline-block')
		mem.append('div')
			.attr('class','pLabelDiv')
			.style('width','135px')
			.style('display','inline-block')
			.text('Memory Limit (Gb)');
		mem.append('div')
			.attr('class','NSliderClass')
			.attr('id','MSlider')
			.style('margin-left','90px')
			.style('width','108px');
		mem.append('input')
			.attr('class','NMaxTClass')
			.attr('id','MMaxT')
			.attr('type','text')
			.style('left','255px')
			.style('width','30px');
	}

	//fullscreen button
	m2.append('div').attr('id','fullScreenDiv')
		.append('button')
		.attr('id','fullScreenButton')
		.attr('class','button')
		.style('width','280px')
		.attr('onclick','fullscreen();')
		.append('span')
			.text('Fullscreen');

	//snapshots
	var snap = m2.append('div')
		.attr('id','snapshotDiv')
		.attr('class', 'button-div')
		.style('width','280px')
	snap.append('button')
		.attr('class','button')
		.style('width','140px')
		.style('padding','5px')
		.style('margin',0)
		.style('opacity',1)
		.on('click',function(){
			sendToViewer([{'renderImage':null}]);
		})
		.append('span')
			.text('Take Snapshot');

	snap.append('input')
		.attr('id','RenderXText')
		.attr('type', 'text')
		.attr('value',GUIParams.renderWidth)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-top','5px')
		.style('margin-right','5px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	snap.append('input')
		.attr('id','RenderYText')
		.attr('type', 'text')
		.attr('value',GUIParams.renderHeight)
		.attr('autocomplete','off')
		.attr('class','pTextInput')
		.style('width','50px')
		.style('margin-top','5px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})

	//save preset button
	m2.append('div').attr('id','savePresetDiv')
		.append('button')
		.attr('id','savePresetButton')
		.attr('class','button')
		.style('width','280px')
		.on('click',function(){
			sendToViewer([{'savePreset':null}]);
		})
		.append('span')
			.text('Save Settings');

	//reset to default button
	m2.append('div').attr('id','resetDiv')
		.append('button')
		.attr('id','resetButton')
		.attr('class','button')
		.style('width','134px')
		.on('click',function(){
			sendToViewer([{'resetToOptions':null}]);
		})
		.append('span')
			.text('Default Settings');
	//reset to preset button
	d3.select('#resetDiv')
		.append('button')
		.attr('id','resetPButton')
		.attr('class','button')
		.style('width','140px')
		.style('left','134px')
		.style('margin-left','0px')
		.on('click',function(){
			loadPreset();
		})
		.append('span')
			.text('Load Settings');

	//load new data button
	m2.append('div').attr('id','loadNewDataDiv')
		.append('button')
		.attr('id','loadNewDataButton')
		.attr('class','button')
		.style('width','280px')
		.on('click',function(){
			sendToViewer([{'loadNewData':null}]);
		})
		.append('span')
			.text('Load New Data');

	m2.style('height', m2height + 'px');
}

function createCameraControlBox(UI){
	/////////////////////////
	//camera
	var c1 = UI.append('div')
		.attr('id','cameraControlsDiv')
		.attr('class','particleDiv')
		.style('width', (GUIParams.containerWidth - 20) + 'px')
	c1.append('div')
		.attr('class','pLabelDiv')
		.style('width', '215px')
		.text('Camera Controls')
	c1.append('button')
		.attr('class','dropbtn')
		.attr('id','cameraControlsDropbtn')
		.attr('onclick','expandDropdown(this);')
		.style('left',(GUIParams.containerWidth - 40) + 'px')
		.html('&#x25BC');
	var c2 = c1.append('div')
		.attr('class','dropdown-content')
		.attr('id','cameraControlsDropdown')
		.style('height','190px');
	//center text boxes
	var c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width','280px')
		.style('margin-top','5px') 
	c3.append('div')
		.style('width','60px')
		.style('display','inline-block')
		.text('Center');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterXText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CenterZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	//center lock checkbox
	var c4 = c3.append('span')
		.attr('id','CenterCheckDiv')
		.style('width','45px')
		.style('margin',0)
		.style('margin-left','10px')
		.style('padding',0);
	c4.append('input')
		.attr('id','CenterCheckBox')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'checkCenterLock':this.checked}]);
		})
	if (GUIParams.useTrackball){
		elm = document.getElementById("CenterCheckBox");
		elm.value = true
		elm.checked = true;
	} else {
		elm = document.getElementById("CenterCheckBox");
		elm.value = false
		elm.checked = false;
	}
	c4.append('label')
		.attr('for','CenterCheckBox')
		.attr('id','CenterCheckLabel')
		.style('font-size','10pt')
		.text('Lock');
	//camera text boxes
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width','280px')
		.style('margin-top','5px') 
	c3.append('div')
		.style('width','60px')
		.style('display','inline-block')
		.text('Camera');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraXText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','CameraZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	//rotation text boxes
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width','280px')
		.style('margin-top','5px') 
	c3.append('div')
		.style('width','60px')
		.style('display','inline-block')
		.text('Rotation');
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotXText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotYText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.style('margin-right','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	c3.append('input')
		.attr('class','pTextInput')
		.attr('id','RotZText')
		.attr('value','1')
		.attr('autocomplete','off')
		.style('width','40px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
	//buttons
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.style('width','280px');
	c3.append('button')
		.attr('id','CameraSave')
		.attr('class','button centerButton')
		.style('margin',0)
		.style('margin-right','8px')
		.style('padding','2px')
		.on('click',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value]}]);
		})
		.append('span')
			.text('Save');
	c3.append('button')
		.attr('id','CameraReset')
		.attr('class','button centerButton')
		.style('margin',0)
		.style('margin-right','8px')
		.style('padding','2px')
		.on('click',function(){
			sendToViewer([{'resetCamera':null}]);
		})
		.append('span')
			.text('Reset');
		c3.append('button')
		.attr('id','CameraRecenter')
		.attr('class','button centerButton')
		.style('margin',0)
		.style('padding','2px')
		.on('click',function(){
			sendToViewer([{'recenterCamera':null}]);
		})
		.append('span')
			.text('Recenter');
	//camera friction
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.attr('id','FrictionDiv')
		// .style('background-color','#808080')
		.style('width','280px')
		.style('padding-top','10px');
	c3.append('div')
		.style('width','55px')
		.style('display','inline-block')
		.text('Friction');
	c3.append('div')
		.attr('class','NSliderClass')
		.attr('id','CFSlider')
		.style('margin-left','10px')
		.style('width','170px');
	c3.append('input')
		.attr('class','NMaxTClass')
		.attr('id','CFMaxT')
		.attr('type','text')
		.style('margin-top','-4px');
	//camera stereo separation
	c3 = c2.append('div')
		.attr('class','pLabelDiv')
		.attr('id','StereoSepDiv')
		// .style('background-color','#808080')
		.style('width','280px')
		.style('padding-top','10px');
	c3.append('div')
		.style('width','55px')
		.style('display','inline-block')
		.text('Stereo');
	c3.append('input')
		.attr('id','StereoCheckBox')
		.attr('type','checkbox')
		.attr('autocomplete','false')
		.on('change',function(){
			sendToViewer([{'checkStereoLock':this.checked}]);
		});
	if (GUIParams.useStereo){
		elm = document.getElementById("StereoCheckBox");
		elm.value = true
		elm.checked = true;
	} else {
		elm = document.getElementById("StereoCheckBox");
		elm.value = false
		elm.checked = false;
	}
	c3.append('div')
		.attr('class','NSliderClass')
		.attr('id','SSSlider')
		.style('margin-left','40px')
		.style('width','140px');
	c3.append('input')
		.attr('class','NMaxTClass')
		.attr('id','SSMaxT')
		.attr('type','text')
		.style('margin-top','-4px');


	// remove this after fixing the camera input boxes!
	disableCameraInputBoxes();
}

function createParticleUIs(UI){
	
	// loop through each of the particle groups and create their UI
	GUIParams.partsKeys.forEach(function(p,i){createParticleUI(UI,p);});
}

function createParticleUI(UI,p){

	//  create container divs for each of the particle groups
	var controls = UI.append('div')
		.attr('class',"particleDiv "+p+"Div")
		.attr('id',p+"Div" ) 
		.style('width', (GUIParams.containerWidth - 20) + 'px');

	// size the overall particle group div
	controls.append('div')
		.attr('class','pLabelDiv')
		.style('width',GUIParams.longestPartLabelLen)
		.text(p)
		
	// add the on-off switch
	var onoff = controls.append('label')
		.attr('class','switch');

	onoff.append('input')
		.attr('id',p+'Check')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.attr('checked','true')
		.on('change',function(){
			sendToViewer([{'checkshowParts':[p,this.checked]}]);})

	if (!GUIParams.showParts[p]){
		elm = document.getElementById(p+'Check');
		elm.checked = false;
		elm.value = false;
	} 

	onoff.append('span')
		.attr('class','slideroo');


	// add the particle size slider
	controls.append('div')
		.attr('id',p+'_PSlider')
		.attr('class','PSliderClass')
		.style('left',(GUIParams.containerWidth - 200) + 'px');

	// add the particle size text input
	controls.append('input')
		.attr('id',p+'_PMaxT')
		.attr('class', 'PMaxTClass')
		.attr('type','text')
		.style('left',(GUIParams.containerWidth - 90) + 'px');

	// add the particle color picker
	controls.append('input')
		.attr('id',p+'ColorPicker');

	createColorPicker(p);

	// fill the dropdown if that's enabled in the Settings.json file
	if (GUIParams.useDropdown[p]){ fillParticleDropdown(controls,p); }
}

function createColorPicker(p){
	/* for color pickers*/
	//can I write this in d3? I don't think so.  It needs a jquery object
	$("#"+p+"ColorPicker").spectrum({
		color: "rgba("+(GUIParams.Pcolors[p][0]*255)+","+(GUIParams.Pcolors[p][1]*255)+","+(GUIParams.Pcolors[p][2]*255)+","+GUIParams.Pcolors[p][3]+")",
		flat: false,
		showInput: true,
		showInitial: false,
		showAlpha: true,
		showPalette: false,
		showSelectionPalette: true,
		clickoutFiresChange: false,
		maxSelectionSize: 10,
		preferredFormat: "rgb",
		change: function(color) {
			console.log(color)
			sendToViewer([{'checkColor':[p, color.toRgb()]}]);
		},
	});

	if (!GUIParams.useColorPicker[p]){
		$("#"+d+"ColorPicker").spectrum({
			color: "rgba("+(GUIParams.Pcolors[p][0]*255)+","+(GUIParams.Pcolors[p][1]*255)+","+(GUIParams.Pcolors[p][2]*255)+","+GUIParams.Pcolors[p][3]+")",
			disabled: true,
		});		
	}

}

function fillParticleDropdown(controls,p){

	// add the dropdown button and a dropdown container div
	controls.append('button')
		.attr('id', p+'Dropbtn')
		.attr('class', 'dropbtn')
		.attr('onclick','expandDropdown(this)')
		.style('left',(GUIParams.containerWidth - 40) + 'px')
		.html('&#x25BC');

	dropdown = controls.append('div')
		.attr('id',p+'Dropdown')
		.attr('class','dropdown-content');

	var dheight = 0;

	// for octree add a button to dispose of the nodes from memory
	if (GUIParams.haveOctree[p]) {

		var clearMem = dropdown.append('div')
			.attr('id',p+'_disposer')
		var b = clearMem.append('button')
			.attr('class','button centerButton')
			.style('margin','10px')
			.style('width',(GUIParams.containerWidth - 40) + 'px')
			.on('click',function(){
				sendToViewer([{'disposeOctreeNodes':[p]}]);
			})
		b.append('span').text('Clear from memory')

		dropdown.append('hr')
			.style('margin','0')
			.style('border','1px solid #909090')

		dheight += 45;

	}

	//dropdown to change blending mode
	var dBcontent = dropdown.append('div')
		.attr('class','NdDiv');

	dBcontent.append('span')
		.attr('class','pLabelDiv')
		.attr('style','width:115px')
		.text('Blending Mode');

	// add blending mode selector
	var selectBType = dBcontent.append('select')
		.attr('class','selectBlendingMode')
		.attr('id',p+'_selectBlendingMode')
		.on('change',selectBlendingMode)

	var optionsB = selectBType.selectAll('option')
		.data(Object.keys(GUIParams.blendingOpts)).enter()
		.append('option')
			.text(function (d) { return d; });

	elm = document.getElementById(p+'_selectBlendingMode');
	elm.value = GUIParams.blendingMode[p];

	depthCheck = dBcontent.append('label')
		.attr('for',p+'_depthCheckBox')
		.attr('id',p+'_depthCheckBoxLabel')
		.style('display','inline-block')
		.style('margin-left','8px')
		.text('Depth');

	depthCheck.append('input')
		.attr('id',p+'_depthCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'setDepthMode':[p, this.checked]}]);
		})

	dropdown.append('hr')
		.style('margin','0')
		.style('border','1px solid #909090');

	dheight += 35;

	// add max number of particles slider 
	dNcontent = dropdown.append('div')
		.attr('class','NdDiv');

	dNcontent.append('span')
		.attr('class','pLabelDiv')
		.attr('style','width:20px')
		.text(function(){
			if (GUIParams.haveOctree[p]) return '%';
			return 'N';
		});

	dNcontent.append('div')
		.attr('id',p+'_NSlider')
		.attr('class','NSliderClass');

	// add max number of particles text input
	dNcontent.append('input')
		.attr('id',p+'_NMaxT')
		.attr('class', 'NMaxTClass')
		.attr('type','text');

	dheight += 45; // height of the max particles section


	//for octree, slider to change the camera limit
	if (GUIParams.haveOctree[p]){
		dCcontent = dropdown.append('div')
			.attr('class','NdDiv');
		dCcontent.append('span')
			.attr('class','pLabelDiv')
			.attr('style','width:140px')
			.text('Octree Cam. Norm');
		dCcontent.append('div')
			.attr('id',p+'_CamSlider')
			.attr('class','NSliderClass')
			.style('margin-left','90px')
			.style('width','90px');
		dCcontent.append('input')
			.attr('id',p+'_CamMaxT')
			.attr('class', 'NMaxTClass')
			.attr('type','text');
		dheight += 45;

	}
	// velocity vectors
	if (GUIParams.haveVelocities[p]){
		fillVelocityVectorDropdown(dropdown,p);
		dheight += 150;
	}

	// colormap
	if (GUIParams.haveColormap[p]){
		// create and fill the colorbar container
		if (!GUIParams.definedColorbarContainer){
			defineColorbarContainer(p)
		}
		fillColormapDropdown(dropdown,p);
		dheight += 50;
	}

	// filters
	if (GUIParams.haveFilter[p]){
		fillFilterDropdown(dropdown,p);
		dheight += 115;
	} 
	
	dropdown.style('height',dheight+'px');
}

function fillVelocityVectorDropdown(dropdown,p){
	dropdown.append('hr')
		.style('margin','0')
		.style('border','1px solid #909090')

	dVcontent = dropdown.append('div')
		.attr('class','NdDiv');

	// add velocity vector checkbox
	dVcontent.append('input')
		.attr('id',p+'velCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'checkVelBox':[p, this.checked]}]);
		})

	dVcontent.append('label')
		.attr('for',p+'velCheckBox')
		.text('Plot Velocity Vectors');

	if (GUIParams.showVel[p]){
		elm = document.getElementById(p+'velCheckBox');
		elm.checked = true;
		elm.value = true;
	} 

	// add velocity vector type selector
	var selectVType = dVcontent.append('select')
		.attr('class','selectVelType')
		.attr('id',p+'_SelectVelType')
		.on('change',selectVelType)

	var options = selectVType.selectAll('option')
		.data(Object.keys(GUIParams.velopts)).enter()
		.append('option')
			.text(function (d) { return d; });

	elm = document.getElementById(p+'_SelectVelType');
	elm.value = GUIParams.velType[p];

	// add width input and gradient checkbox
	dVWcontent = dropdown.append('div')
		.attr('class','NdDiv');
	dVWcontent.append('span')
		.attr('class','pLabelDiv')
		.attr('style','width:100px')
		.text('Vector Width');
	dVWcontent.append('div')
		.attr('id',p+'_VelWidthSlider')
		.attr('class','NSliderClass')
		.style('margin-left','48px')
		.style('width','132px');
	dVWcontent.append('input')
		.attr('id',p+'_VelWidthMaxT')
		.attr('class', 'NMaxTClass')
		.attr('type','text');

	dVGcontent = dropdown.append('div')
		.attr('class','NdDiv');

	dVGcontent.append('input')
		.attr('id',p+'velGradientCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'toggleVelocityGradient':[p, this.checked]}]);
		})

	dVGcontent.append('label')
		.attr('for',p+'velGradientCheckBox')
		.text('Apply Gradient to Vectors');

	// add velocity animator checkbox
	dAVcontent = dropdown.append('div')
		.attr('class','NdDiv');

	dAVcontent.append('input')
		.attr('id',p+'velAnimateCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'toggleVelocityAnimation':[p, this.checked]}]);
		})

	dAVcontent.append('label')
		.attr('for',p+'velAnimateCheckBox')
		.text('Animate Velocities');

	//add velocity animator input text boxes
	dATVcontent = dropdown.append('div')
		.attr('class','NdDiv');
	dATVcontent.append('label')
		.attr('for',p+'velAnimateDt')
		.text('dt');
	dATVcontent.append('input')
		.attr('id',p+'velAnimateDt')
		.attr('type', 'text')
		.attr('value',GUIParams.animateVelDt)
		.attr('autocomplete','off')
		.attr('class','pTextInput velAnimateDt')
		.style('width','50px')
		.style('margin-left','8px')
		.style('margin-right','20px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value, p]}]);
		})
	dATVcontent.append('label')
		.attr('for',p+'velAnimateTmax')
		.text('tMax');
	dATVcontent.append('input')
		.attr('id',p+'velAnimateTmax')
		.attr('type', 'text')
		.attr('value',GUIParams.animateVelTmax)
		.attr('autocomplete','off')
		.attr('class','pTextInput velAnimateTmax')
		.style('width','50px')
		.style('margin-left','8px')
		.on('keypress',function(){
			var key = event.keyCode || event.which;
			if (key == 13) sendToViewer([{'checkText':[this.id, this.value, p]}]);
		})

	if (GUIParams.animateVel[p]){
		elm = document.getElementById(p+'velAnimateCheckBox');
		elm.checked = true;
		elm.value = true;
	} 


}

function fillColormapDropdown(dropdown,p){
	dropdown.append('hr')
		.style('margin','0')
		.style('border','1px solid #909090')

	var ColorDiv = dropdown.append('div')
		.attr('style','margin:0px;  padding:5px; height:50px')

	// add checkbox to enable colormap
	ColorDiv.append('input')
		.attr('id',p+'colorCheckBox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.on('change',function(){
			sendToViewer([{'checkColormapBox':[p, this.checked]}]);
		})

	ColorDiv.append('label')
		.attr('for',p+'colorCheckBox')
		.text('Colormap');

	// dropdown to select colormap
	var selectCMap = ColorDiv.append('select')
		.attr('class','selectCMap')
		.attr('id',p+'_SelectCMap')
		.style('margin-left','4px')
		.on('change', selectColormap)

	var options = selectCMap.selectAll('option')
		.data(GUIParams.colormapList).enter()
		.append('option')
			.attr('value',function(d,i){ return i; })
			.text(function (d) { return d; });

	// dropdown to select colormap variable
	var selectCMapVar = ColorDiv.append('select')
		.attr('class','selectCMapVar')
		.attr('id',p+'_SelectCMapVar')
		.on('change',selectColormapVariable)

	var options = selectCMapVar.selectAll('option')
		.data(GUIParams.ckeys[p]).enter()
		.append('option')
			.attr('value',function(d,i){ return i; })
			.text(function (d) { return d; });

	// sliders for colormap limits
	GUIParams.ckeys[p].forEach(function(ck){
		if (GUIParams.haveColormapSlider){

			colormapsliders = ColorDiv.append('div')
				.attr('id',p+'_CK_'+ck+'_END_CMap')
				.attr('class','CMapClass')

			colormapsliders.append('div')
				.attr('class','CMapClassLabel')

			colormapsliders.append('div')
				.attr('id',p+'_CK_'+ck+'_END_CMapSlider')
				.style("margin-top","-1px")

			colormapsliders.append('input')
				.attr('id',p+'_CK_'+ck+'_END_CMapMinT')
				.attr('class','CMapMinTClass')
				.attr('type','text');

			colormapsliders.append('input')
				.attr('id',p+'_CK_'+ck+'_END_CMapMaxT')
				.attr('class','CMapMaxTClass')
				.attr('type','text');

		}
	});


	// handle if colormap should be enabled at startup by pre-checking
	//  the box
	if (GUIParams.showColormap[p]){
		elm = document.getElementById(p+'colorCheckBox');
		elm.checked = true;
		elm.value = true;
		var idx = parseInt(Math.round(GUIParams.colormap[p]*256/8 - 0.5));
		document.getElementById(p+'_SelectCMap').value = idx.toString();
		document.getElementById(p+'_SelectCMapVar').value = GUIParams.colormapVariable[p].toString();
		fillColorbarContainer(p);

		// show the colorbar container if showCmap is True
		d3.select('#colorbar_container').classed('hidden', false);
	} 
	showHideColormapFilter(p, GUIParams.colormapVariable[p]);
}

function fillFilterDropdown(dropdown,p){
	dropdown.append('hr')
		.style('margin','0')
		.style('border','1px solid #909090')

	var filterDiv = dropdown.append('div')
		.attr('style','margin:0px;  padding:5px; height:45px')

	// add filter key selector
	var selectF = filterDiv.append('div')
		//.attr('style', 'height:20px')
		.attr('style','height:20px; display:inline-block')
		.html('Filters &nbsp')	
		.append('select')
		.attr('style','width:160px')
		.attr('class','selectFilter')
		.attr('id',p+'_SelectFilter')
		.on('change',selectFilter)

	var options = selectF.selectAll('option')
		.data(GUIParams.fkeys[p]).enter()
		.append('option')
			.text(function (d) { return d; });

	var invFilter = dropdown.append('div')
		.attr('class','NdDiv');

	var filtn = 0;
	// create sliders for each of the filters
	GUIParams.fkeys[p].forEach(function(fk){
		if (GUIParams.haveFilterSlider[p][fk] != null){

			dfilters = filterDiv.append('div')
				.attr('id',p+'_FK_'+fk+'_END_Filter')
				.attr('class','FilterClass')
				.style('display','block');

			dfilters.append('div')
				.attr('class','FilterClassLabel')

			dfilters.append('div')
				.attr('id',p+'_FK_'+fk+'_END_FilterSlider')
				.style("margin-top","-1px")

			dfilters.append('input')
				.attr('id',p+'_FK_'+fk+'_END_FilterMinT')
				.attr('class','FilterMinTClass')
				.attr('type','text');

			dfilters.append('input')
				.attr('id',p+'_FK_'+fk+'_END_FilterMaxT')
				.attr('class','FilterMaxTClass')
				.attr('type','text');

			invFilter.append('input')
				.attr('id',p+'_FK_'+fk+'_END_InvertFilterCheckBox')
				.attr('value','false')
				.attr('type','checkbox')
				.attr('autocomplete','off')
				.on('change',function(){
					sendToViewer([{'checkInvertFilterBox':[p, fk, this.checked]}]);
				})
			invFilter.append('label')
				.attr('for',p+'_FK_'+fk+'_'+'InvertFilterCheckBox')
				.attr('id',p+'_FK_'+fk+'_END_InvertFilterCheckBoxLabel')
				.style('display','inline-block')
				.text('Invert Filter');

			filtn += 1;

		}
		
		// handle invert filter checkbox
		elm = document.getElementById(p+'_FK_'+fk+'_END_InvertFilterCheckBox');
		elm.checked = GUIParams.invertFilter[p][fk];
		elm.value = GUIParams.invertFilter[p][fk];
		
		if (filtn > 1){
			d3.selectAll('#'+p+'_FK_'+fk+'_END_Filter')
				.style('display','none');
			d3.selectAll('#'+p+'_FK_'+fk+'_END_InvertFilterCheckBox')
				.style('display','none');
			d3.selectAll('#'+p+'_FK_'+fk+'_END_InvertFilterCheckBoxLabel')
				.style('display','none');
		}
	});

	// add playback checkbox and label
	playback = dropdown.append('div')
		.attr('class','NdDiv');
	playback.append('input')
		.attr('id',p+'_PlaybackCheckbox')
		.attr('value','false')
		.attr('type','checkbox')
		.attr('autocomplete','off')
		.style('display','inline-block')
		.on('change',function(){
			togglePlayback(p, this.checked)});
	playback.append('label')
		.attr('for',p+'_'+'PlaybackLabel')
		.attr('id',p+'_PlaybackLabel')
		.text('Playback');

}

//////////////////////// ////////////////////////
// helper functions vvvvvvv
//////////////////////// ////////////////////////

////////////////////////
// update the text in the camera location
////////////////////////
function updateUICenterText(){
	var el;
	if (GUIParams.useTrackball){
		el = document.getElementById("CenterXText");
		if (el != null) el.value = GUIParams.controlsTarget.x;

		el = document.getElementById("CenterYText");
		if (el != null) el.value = GUIParams.controlsTarget.y;
		
		el = document.getElementById("CenterZText");
		if (el != null) el.value = GUIParams.controlsTarget.z;
	} else {
		el = document.getElementById("CenterXText");
		if (el != null) el.value = GUIParams.cameraDirection.x + GUIParams.cameraPosition.x;

		el = document.getElementById("CenterYText");
		if (el != null) el.value = GUIParams.cameraDirection.y + GUIParams.cameraPosition.y;

		el = document.getElementById("CenterZText");
		if (el != null) el.value = GUIParams.cameraDirection.z + GUIParams.cameraPosition.z;		
	}
}

function updateUICameraText(){
	var el = document.getElementById("CameraXText");
	if (el != null) el.value = GUIParams.cameraPosition.x;
	
	el = document.getElementById("CameraYText"); 
	if (el != null) el.value = GUIParams.cameraPosition.y;
		
	el = document.getElementById("CameraZText"); 
	if (el != null) el.value = GUIParams.cameraPosition.z;
}

function updateUIRotText(){
	var el = document.getElementById("RotXText");
	if (el != null) el.value = GUIParams.cameraRotation._x;

	var el = document.getElementById("RotYText");
	if (el != null) el.value = GUIParams.cameraRotation._y;

	el = document.getElementById("RotZText");
	if (el != null) el.value = GUIParams.cameraRotation._z;
}

//////////////////////
// presets
//////////////////////
//load a preset file
function loadPreset(){
	document.getElementById("presetFile").click();
}

//read a preset file
d3.select('body').append('input')
	.attr('type','file')
	.attr('id','presetFile')
	.on('change', function(e){
		file = this.files[0];
		if (file != null){
			readPreset(file);
		}})
	.style('display','None');
	
function readPreset(file){
	//get the new options JSON
	var preset = {};
	preset.loaded = false;

	var reader = new FileReader();
	reader.readAsText(file, 'UTF-8');
	reader.onload = function(){
		preset = JSON.parse(this.result);
		if (preset.loaded){
			document.getElementById("presetFile").value = "";
			sendToViewer([{'resetToPreset':preset}]);
		}
	}
}


//////////////////////
// various functions tied to buttons in UI
//////////////////////
function selectVelType() {
	//type of symbol to draw velocity vectors (from input box)
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	var selectValue = option.property('value');

	var p = this.id.slice(0,-14)
	sendToViewer([{'setViewerParamByKey':[selectValue, "velType",p]}]);
}

function selectBlendingMode() {
	//type of symbol to draw velocity vectors (from input box)
	var option = d3.select(this)
		.selectAll("option")
		.filter(function (d, i) { 
			return this.selected; 
	});
	var selectValue = option.property('value');

	var p = this.id.slice(0,-19)
	sendToViewer([{'setBlendingMode':[selectValue, p]}]);
}

function changeUISnapSizes(){
	//size of the snapshot (from text input)
	var el = document.getElementById("RenderXText");
	if (el) el.value = GUIParams.renderWidth;

	el = document.getElementById("RenderYText");
	if (el) el.value = GUIParams.renderHeight;
}

function togglePlayback(p,checked){
	// figure out which checkbox was checked by slicing the ID, clever move Aaron!
	this_label = document.getElementById(p+'_PlaybackLabel');

	//reset the text/appstate to default values
	this_label.childNodes[0].nodeValue = 'Playback: ';

	var forViewer = [];
	var playbackEnabled = false;
	var updateFilter = false

	if (checked){
		//this_label.childNodes[0].nodeValue += "under development";
		this_label.childNodes[0].nodeValue += GUIParams.currentlyShownFilter[p];

		playbackEnabled = true;
		updateFilter = true;
	}

	forViewer.push({'setViewerParamByKey':[0, 'parts',p,"playbackTicks"]})
	forViewer.push({'setViewerParamByKey':[playbackEnabled,'parts',p,"playbackEnabled"]})
	forViewer.push({'setViewerParamByKey':[updateFilter, "updateFilter",p,]})

	if (checked) forViewer.push({'updatePlaybackFilter':[p]})

	sendToViewer(forViewer);

}


//////////////////////
// to move the GUI around on the screen
// from https://www.w3schools.com/howto/howto_js_draggable.asp
//////////////////////
function dragElement(elm, e) {
	var elmnt = document.getElementsByClassName("UIcontainer")[0];
	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
	dragMouseDown(e);


	function dragMouseDown(e) {
		e = e || window.event;
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.addEventListener('mouseup', closeDragElement);
		document.addEventListener('mousemove', elementDrag);

	}

	function elementDrag(e) {
		GUIParams.movingUI = true;
		e = e || window.event;
		// calculate the new cursor position:
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;

		// set the element's new position:
		var top = parseInt(elmnt.style.top);
		var left = parseInt(elmnt.style.left);
		elmnt.style.top = (top - pos2) + "px";
		elmnt.style.left = (left - pos1) + "px";
	}

	function closeDragElement(e) {
		/* stop moving when mouse button is released:*/
		GUIParams.movingUI = false;
		e.stopPropagation();
		document.removeEventListener('mouseup', closeDragElement);
		document.removeEventListener('mousemove', elementDrag);

	}
}

/////////////
// for show/hide of elements of the UI
//////////////
function hideUI(x){
	if (!GUIParams.movingUI){

		x.classList.toggle("change");
		var UI = document.getElementById("UIhider");
		var UIc = document.getElementsByClassName("UIcontainer")[0];
		var UIt = document.getElementById("ControlsText");
		//var UIp = document.getElementsByClassName("particleDiv");
		var UIp = d3.selectAll('.particleDiv');
		if (GUIParams.UIhidden){
			UI.style.display = 'inline';
			//UI.style.visibility = 'visible';
			UIc.style.borderStyle = 'solid';
			UIc.style.marginLeft = '0';
			UIc.style.marginTop = '0';
			UIc.style.width = GUIParams.containerWidth + 'px';
			//UIp.style('width', '280px');
			UIt.style.opacity = 1;
		} else {
			UI.style.display = 'none';
			//UI.style.visibility = 'hidden';
			UIc.style.borderStyle = 'none';
			UIc.style.marginLeft = '2px';
			UIc.style.marginTop = '2px';
			UIc.style.width = '35px';
			//UIp.style('width', '35px');
			UIt.style.opacity = 0;
		}
		var UIt = document.getElementById("UItopbar");
		//UIt.style.display = 'inline';
		GUIParams.UIhidden = !GUIParams.UIhidden
	}
}

function expandDropdown(handle) {
	var offset = 5;

	// find the position in the partsKeys list
	var pID = handle.id.slice(0,-7); // remove  "Dropbtn" from id
	i = getPi(pID);
	document.getElementById(pID+"Dropdown").classList.toggle("show");

	var pdiv;
	var ddiv = document.getElementById(pID+'Dropdown');
	var ht = parseFloat(ddiv.style.height.slice(0,-2)) + offset; //to take off "px"
	var pb = 0.;

	keys = Object.keys(GUIParams.gtoggle)
	pdiv = document.getElementById(keys[i+1]+'Div');
	if (i < keys.length-1){
		if (GUIParams.gtoggle[pID]){
			pdiv.style.marginTop = ht + "px";
		} else {
			pdiv.style.marginTop = "0px";
		}
	} else {
		//handle the last one differently
		c = document.getElementsByClassName("UIcontainer")[0];
		if (GUIParams.gtoggle[pID]){
			c.style.paddingBottom = (pb+ht-5)+'px';
		} else {
			c.style.paddingBottom = pb+'px';	
		}
	}

	GUIParams.gtoggle[pID] =! GUIParams.gtoggle[pID];	

}

function getPi(pID){
	var i=0;
	keys = Object.keys(GUIParams.gtoggle)
	for (i=0; i<keys.length; i++){
		if (pID == keys[i]){
			break;
		}
	}
	return i
}

/////////////
// read values from UI and send to viewer
//////////////
function updateUIValues(value, varArgs, i=0, type='single'){

	var forViewer = [];

	//these update the viewer parameters
	if (varArgs){
		if (varArgs.hasOwnProperty('f')){
			varToSetSend = [];
			varArgs.v.forEach(function(x){
				varToSetSend.push(x);
			})
			if (type == "double") varToSetSend.push(i); //adding this only for double sliders 
			varToSetSend[0] = parseFloat(value);
			toSend = {};
			toSend[varArgs.f]= varToSetSend;

			forViewer.push(toSend);
		}

		//is there a more efficient way to check for all of these?
		if (varArgs.hasOwnProperty('f1')){
			toSend = {};
			toSend[varArgs.f1]= varArgs.v1;
			forViewer.push(toSend);
		}

		if (varArgs.hasOwnProperty('f2')){
			toSend = {};
			toSend[varArgs.f2]= varArgs.v2;
			forViewer.push(toSend);
		}

		if (varArgs.hasOwnProperty('f3')){
			toSend = {};
			toSend[varArgs.f3]= varArgs.v3;
			forViewer.push(toSend);
		}

		if (varArgs.hasOwnProperty('f4')){
			toSend = {};
			toSend[varArgs.f4]= varArgs.v4;
			forViewer.push(toSend);
		}

		if (varArgs.hasOwnProperty('f5')){
			toSend = {};
			toSend[varArgs.f5]= varArgs.v5;
			forViewer.push(toSend);
		}

		if (varArgs.hasOwnProperty('f6')){
			toSend = {};
			toSend[varArgs.f6]= varArgs.v6;
			forViewer.push(toSend);
		}
		//console.log('updateUIValues', forViewer);
		sendToViewer(forViewer);

		//this can run a function in the GUI (can I improve on this method?)
		if (varArgs.hasOwnProperty('evalString')) eval(varArgs.evalString);

	}
}

function updateUIBlending(args){
	var mode = args[0];
	var dTest = args[1];

	GUIParams.partsKeys.forEach(function(p){
		var elm = document.getElementById(p+'_selectBlendingMode');
		elm.value = mode;

		//also update the checkboxes
		elm = document.getElementById(p+'_depthCheckBox');
		elm.checked = dTest;
		elm.value = dTest
	})
}

//////////////////////////////////////////
// disable the camera text input boxes (they don't work properly)
// this function is called right after creating the UI; remove it once the input boxes functionality is fixed!
/////////////////////////////////////////
function disableCameraInputBoxes(){
	// this does the job but turns the boxes gray
	// document.getElementById('CenterXText').disabled = true;
	// document.getElementById('CenterYText').disabled = true;
	// document.getElementById('CenterZText').disabled = true;

	// document.getElementById('CameraXText').disabled = true;
	// document.getElementById('CameraYText').disabled = true;
	// document.getElementById('CameraZText').disabled = true;

	// document.getElementById('RotXText').disabled = true;
	// document.getElementById('RotYText').disabled = true;
	// document.getElementById('RotZText').disabled = true;

	// this does the job without graying out the boxes
	document.getElementById('CenterXText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('CenterYText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('CenterZText').onkeydown = function(e){ e.preventDefault(); };

	document.getElementById('CameraXText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('CameraYText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('CameraZText').onkeydown = function(e){ e.preventDefault(); };

	document.getElementById('RotXText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('RotYText').onkeydown = function(e){ e.preventDefault(); };
	document.getElementById('RotZText').onkeydown = function(e){ e.preventDefault(); };
}

//////////////////////// ////////////////////////
// helper functions ^^^^^^^
//////////////////////// ////////////////////////