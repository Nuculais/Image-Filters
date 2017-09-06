
var canvas;
var context; 
var originalImage; // Variable to save the original image in (so you can revert to the original)

var filterHistory;  // Stores the users history of filter uses

// When the page have finished loading
$( document ).ready(function(){

	// Sets the "global" variables values
	
	canvas = $("#workCanvas").get(0);
	context = canvas.getContext("2d");
	
	// Sets a test image as the image to change, also draws it on the canvas
    setImage('res/image.jpg');
	
// Button Listeners	for filters
	$("#invert").click(function() {
		invert();
	});
	
	$("#sharpen").click(function() {
		var pixelWeightMatrix = [[0, -0.2, 0], 
								[-0.2, 1.8, -0.2], 
								[0, -0.2, 0]];
		spatialConvolution(pixelWeightMatrix, 1);
	});
	
	$("#blur").click(function() {
		var pixelWeightMatrix = [[1, 1, 1], 
								[1, 1, 1], 
								[1, 1, 1]];
		spatialConvolution(pixelWeightMatrix, 9);
	});
	
	$("#darken").click(function() {
		var pixelWeightMatrix = [[0.9]];
		spatialConvolution(pixelWeightMatrix, 1);
	});
	
	$("#brighten").click(function() {
		var pixelWeightMatrix = [[1.1]];
		spatialConvolution(pixelWeightMatrix, 1);
	});
	
	$("#svartvit").click(function() {
		Svartvit();
});
	
	$("#customSpatialConvolutionButton").click(function() {
		var pixelWeightMatrix = [[1, 1, 1], 
								[1, 1, 1], 
								[1, 1, 1]];
		for(var y = 0; y < pixelWeightMatrix.length; y++){
			for(var x = 0; x < pixelWeightMatrix[y].length; x++){
				pixelWeightMatrix[y][x] = $("#" + x.toString() + y.toString() + "").val();
			}
		}
		spatialConvolution(pixelWeightMatrix, $("#scale").val());
	});
	
// Button Listeners	for History functions	
	$("#reset").click(function() {
		resetToOriginal();
	});
	
	$("#undo").click(function() {
		filterHistory.stepBack();
		
		if(!filterHistory.hasPrevious()){
			$("#undo").get(0).disabled = true;
		}
		$("#redo").get(0).disabled = false;
		context.putImageData(filterHistory.getCurrent(),0, 0);
	});
	
	$("#redo").click(function() {
		filterHistory.stepForward();
		if(!filterHistory.hasNext()){
			$("#redo").get(0).disabled = true;
		}
		$("#undo").get(0).disabled = false;
		context.putImageData(filterHistory.getCurrent(),0, 0);
	});
	
	
// 	Select what image to use
	$("#selectImageFromPC").change(function(e){
		// Not safe, user can select any kind of file not just images. 
		var url = URL.createObjectURL(e.target.files[0]);
		setImage(url);
	});
	/* Not Allowed to change pixels of images from other sites due to security reasons (cross-origin)
	$("#selectImageFromURL").click(function() {
		setImage($("#URLForSelectImageFromURL").val());
	});
	*/
	
});

function addToHistory(imageData){
	filterHistory.add(imageData);

	$("#redo").get(0).disabled = true;
	if(!filterHistory.hasPrevious()){
		$("#undo").get(0).disabled = true;
	}
	else{
		$("#undo").get(0).disabled = false;
	}
}

// invert filter function
function invert(){
	var imageData = context.getImageData(0,0,canvas.width,canvas.height);
	var pixelData = imageData.data;// the actual pixel values

	// the color inversion
	for (i = 0; i < pixelData.length; i+=4) { 
		pixelData[i]     = 255 - pixelData[i];     // red
		pixelData[i + 1] = 255 - pixelData[i + 1]; // green
		pixelData[i + 2] = 255 - pixelData[i + 2]; // blue
	}
	animateFilterTransistion(imageData, 2, 30)
	//context.putImageData(imageData,0, 0);// replaces the old image data with the updated ones
	addToHistory(imageData);
}

//Black&White filter
function Svartvit() {
	//canvas, context and originalImage = already existing variables
	
	var imagedata = context.getImageData(0,0,canvas.width,canvas.height);
	var pix = imagedata.data;
	
	if (imagedata != "") {
        for (y = 0; y < imagedata.height; y++) {
            for (x = 0; x < imagedata.width; x++) {
                var i = ((y * 4) * imagedata.width) + (x * 4);
	
	var sv = parseInt((pix[i] + pix[i + 1] + pix[i + 2]) / 3)
	pix[i] = sv;   //r
	pix[i+1] = sv; //g
	pix[i+2] = sv; //b
	pix[i+3] = 255; //a (alpha channel)
	//sv = average of r's, g's och b's value, svartvit = all colour channels have the same value
			}
		}
		context.putImageData(imgagedata, 0, 0);
	}
}



function spatialConvolution(pixelWeightMatrix, scale){ // pixelWeightMatrix needs to be a jagged int array with a size of 3x3, 5x5, 7x7 ... 
	var borderSizeInPix = ((pixelWeightMatrix.length-1)/2);// how many pixels on the border to ignore
	var borderSize = borderSizeInPix*4; // bordersize in pixeldata size
	
	var imageData = context.getImageData(0,0,canvas.width,canvas.height);
	var outputImageData = context.getImageData(0,0,canvas.width,canvas.height);// need two so it doesn't use edited values when calculating new ones
	
	var pixelData = imageData.data;
	var outputPixelData = outputImageData.data;

	// loops through all pixels
	for (y = borderSize; y < imageData.height*4 - borderSize; y += 4) { 
		for (x = borderSize; x < imageData.width*4 - borderSize; x += 4) { 
			var i = x + (y * imageData.width);// from two dimensional to one dimensional
			var rSum = 0;
			var gSum = 0; 
			var bSum = 0;
			var aSum = 0;
			
			// loops through all pixelWeightMatrix values
			for(var yPG = 0; yPG < pixelWeightMatrix.length; yPG++){
				for(var xPG = 0; xPG < pixelWeightMatrix[yPG].length; xPG++){
					// the offset from the middle pixel
					var offset = ((xPG-borderSizeInPix)*4) + ((yPG-borderSizeInPix)*4*imageData.width)
					
					// adds values based on pixel weight
					rSum += pixelData[i + offset] * pixelWeightMatrix[xPG][yPG]; //red
					gSum += pixelData[i + 1 + offset] * pixelWeightMatrix[xPG][yPG]; // green
					bSum += pixelData[i + 2 + offset] * pixelWeightMatrix[xPG][yPG]; // blue
					aSum += pixelData[i + 3 + offset] * pixelWeightMatrix[xPG][yPG]; // alpha
				}
			}
			// final pixel values
			outputPixelData[i] = rSum/scale;
			outputPixelData[i + 1] = gSum/scale;
			outputPixelData[i + 2] = bSum/scale;
			outputPixelData[i + 4] = aSum/scale;
		}
	}
	animateFilterTransistion(outputImageData, 2, 30)
	//context.putImageData(outputImageData,0, 0);
	addToHistory(outputImageData);
}

// Sets the selected image from imagePath as the one we want to use filters on.
function setImage(imagePath){
	originalImage = new Image();
	originalImage.onload = function() {
		// Sets the canvas size to that of the image
		resetToOriginal();
    };
	
	// sets the source of the image, comes after the thing just above so it doesn't finish loading before the modifiedImage.onload function exists
	originalImage.src = imagePath;
}

// Also used first time
function resetToOriginal(){
	canvas.width = originalImage.width;
	canvas.height = originalImage.height;
	context.drawImage(originalImage, 0, 0);	
	
	filterHistory = new HistoryObject(10);
	addToHistory(context.getImageData(0,0,canvas.width,canvas.height));
}

var animateFilterTransistionInterval;
var animateFilterTransistionDrawPartCurrentPos = 0;
function animateFilterTransistion(newImageData, totalTime, fps){
	if(animateFilterTransistionDrawPartCurrentPos == 0){
		
	
	
	var widthToDraw = newImageData.width / (totalTime*fps);
	animateFilterTransistionInterval = setInterval(function () {
		animateFilterTransistionDrawPart(newImageData, Math.floor(widthToDraw))}
		, 1000/fps);
	}
}

function animateFilterTransistionDrawPart(newImageData, widthToDraw){
	context.putImageData(newImageData, 
						0, 0, 
						animateFilterTransistionDrawPartCurrentPos, 0, 
						widthToDraw, newImageData.height);					
					
	animateFilterTransistionDrawPartCurrentPos += widthToDraw;
	
	context.beginPath();
	context.fillStyle="#FF0000";
	context.rect(animateFilterTransistionDrawPartCurrentPos, 0, 3, newImageData.height);
	context.fill();
	context.closePath();
	
	if(animateFilterTransistionDrawPartCurrentPos > newImageData.width){
		clearInterval(animateFilterTransistionInterval);
		animateFilterTransistionDrawPartCurrentPos = 0;
	}
}


function HistoryObject(length) {
    // Constructor stuff
	list = new Array(length);
	start = 0;
	next = 0;
	
	this.add = function(object){
		list[next] = object;
		next = addAndLoop(next, 1);

		if(next == start){
			start = addAndLoop(next, 1);
		}
		list[next] = null; // nulls the next entry (so you cant go back, add new, then go forward)
	};
	
	this.stepForward = function(){
		if(this.hasNext()){
			next = addAndLoop(next, 1);
		}
	};
	
	this.stepBack = function(){
		if(this.hasPrevious()){
			next = addAndLoop(next, -1);
		}
	};
	
	this.hasNext = function(){
		return list[next] != null;
	};
	this.hasPrevious = function(){
		return addAndLoop(next, -1) != start;
	};
	
	this.getCurrent = function(){
		return list[addAndLoop(next, -1)];
	};
	
	// no this for private stuff
	addAndLoop = function(a, b){
		var sum = a + b;
		if(sum >= list.length){
			sum = 0;
		}
		else if(sum < 0){
			sum = list.length-1;
		}
		return sum;
	}
		
	
}