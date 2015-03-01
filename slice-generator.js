/* TODO
 * Fix to dynamically size svg images to the max dims of the slices
 * Add kerf
 * Allow separate X & Y widths and min/max values
 * Make svgs vertical (eg. slices stay the same, but each is below the previous)
 * Also, stack slices as close together as possible, based on max height
 */

// Requries math.js to be loaded

// setup variables
var XMIN = 0;
var XMAX = 1;
var WIDTH_MM = 150;
var BASEHEIGHT_MM = 20;
var CUTOUT_MM = 1;
var NUM_CUTS = 10;
var CUTSPACING_MM = WIDTH_MM  / (NUM_CUTS + 1);
var FUNCTION_STRING = ""

function setVariables(settings) {
    FUNCTION_STRING = settings["z_function"];
    WIDTH_MM = math.eval(settings["width"]);
    NUM_CUTS = math.eval(settings["num_slices"]);
    CUTOUT_MM = math.eval(settings["thickness"]);
    CUTSPACING_MM = WIDTH_MM  / (NUM_CUTS + 1);
}

// raw mathematical function
function rawFunction(xval, yval) {
    var scope = { x: xval, y: yval };
    return math.eval(FUNCTION_STRING, scope);
    // return Math.pow(x,2) + Math.pow(y,3);
}

// raw values converted to mm
function getValue(x, y) {
    var scale = WIDTH_MM / (XMAX - XMIN);
    return rawFunction(x/scale, y/scale) * scale + BASEHEIGHT_MM;
}

// convert an array of x, y points to an svg path
function pointsToLines(data) {
    var s = "";
    for(var i = 0; i < data.length; i++) {
        s += (i == 0) ? "M" : "L";
        s += data[i].x + "," + data[i].y;
    }
    return s;
}

// get the max y value for an array of x,y pairs
function maxY(data) {
    if( !data || data.length == 0 ) return data;
    if( data.length == 1 ) return data[0].y;
    
    var max = data[0].y;
    for( var i = 1; i < data.length; i++ ) {
        max = Math.max(max, data[i].y);
    }
    return max;
}

// get the min y value for an array of x,y pairs
function minY(data) {
    if( !data || data.length == 0 ) return data;
    if( data.length == 1 ) return data[0].y;
    
    var min = data[0].y;
    for( var i = 1; i < data.length; i++ ) {
        min = Math.min(min, data[i].y);
    }
    return min;
}

function genYSlice(Y) {
    // Step 1: create array of necessary x values
    var cut_centers = [];
    var cuts = [];
    var x = 0;
    for(var i=0; i < NUM_CUTS; i++) {
        x += CUTSPACING_MM;
        cut_centers.push(x);
        cuts.push(x - CUTOUT_MM / 2);
        cuts.push(x + CUTOUT_MM / 2);
    }
    
    var xvalues = [ (CUTSPACING_MM - CUTOUT_MM) / 2 ];
    
    for(var i=0; i < cut_centers.length; i++) {
        xvalues.push(cut_centers[i] + (CUTSPACING_MM - CUTOUT_MM) / 2);
    }
    // add the start and endpoint as well
    xvalues.push(0);
    xvalues.push(WIDTH_MM);
    
    xvalues = xvalues.concat(cuts).sort(function(a, b){return a-b});
    
    // xvalues: [ 0, 24.5, 49.5, 50.5, 74.5, 99.5, 100.5, 124.5, 150 ]
    // cuts:    [ 49.5, 50.5, 99.5, 100.5 ]
    
    // Step 2: create an array of x,y pairs for all the necessary points & cutouts
    var path = [{"x": 0, "y": 0}];
    
    for(var i = 0, xval = 0; i < xvalues.length; i++) {
        xval = xvalues[i];
        if(cuts.indexOf(xval) > -1) {
            // a cutout, so do something different
            var yval = getValue(xval+CUTOUT_MM/2,Y);
            path.push( { "x": xval, "y": getValue(xval,Y) } );
            path.push( { "x": xval, "y": (yval / 2) } );
            path.push( { "x": (xval + CUTOUT_MM), "y": (yval / 2) } );
            i++;
            xval = xvalues[i];
            path.push( { "x": xval, "y": getValue(xval,Y) } );
        } else {
            path.push( { "x": xval, "y": getValue(xval,Y) } );
        }
    }
    // close out the path
    path.push({"x": WIDTH_MM, "y": 0});
    path.push({"x": 0, "y": 0});
    return { "type": "ySlice",
             "sliceVal": Y,
             "min":  minY(path),
             "max":  maxY(path),
             "data": path };
}


function allTheYSlices() {
    var slices = [];
    for(var i = 0, y = 0; i < NUM_CUTS; i++) {
        y += CUTSPACING_MM;
        var aSlice = genYSlice(y);
        aSlice["dataOutput"] = aSlice.data.map(
            function(d) { d.x += (WIDTH_MM+5)*i; return d }
        );
        aSlice["path"] = pointsToLines(aSlice.data);
        slices.push(aSlice);
    }
    return slices;
}

var X = 0;

function genXSlice(X) {
    // Step 1: create array of necessary x values
    var cut_centers = [];
    var cuts = [];
    var y = 0;
    for(var i=0; i < NUM_CUTS; i++) {
        y += CUTSPACING_MM;
        cut_centers.push(y);
        cuts.push(y - CUTOUT_MM / 2);
        cuts.push(y + CUTOUT_MM / 2);
    }
    
    var yvalues = [ (CUTSPACING_MM - CUTOUT_MM) / 2 ];
    
    for(var i=0; i < cut_centers.length; i++) {
        yvalues.push(cut_centers[i] + (CUTSPACING_MM - CUTOUT_MM) / 2);
    }
    // add the start and endpoint as well
    yvalues.push(0);
    yvalues.push(WIDTH_MM);
    
    yvalues = yvalues.concat(cuts).sort(function(a, b){return a-b});
    
    // yvalues: [ 0, 24.5, 49.5, 50.5, 74.5, 99.5, 100.5, 124.5, 150 ]
    // cuts:    [ 49.5, 50.5, 99.5, 100.5 ]
    
    // Step 2: create an array of x,y pairs for all the necessary points & cutouts
    var path = [{"x": 0, "y": 0}];
    
    for(var i = 0, yval = 0; i < yvalues.length; i++) {
        yval = yvalues[i];
        path.push( { "x": yval, "y": getValue(X, yval) } );
    }
    // close out the path
    // path.push({"x": WIDTH_MM, "y": 0});
    // path.push({"x": 0, "y": 0});
    
    yvalues = yvalues.reverse(function(a, b){return a-b});
    
    for(var i = 0, yval = 0; i < yvalues.length; i++) {
        yval = yvalues[i];
        if(cuts.indexOf(yval) > -1) {
            // a cutout, so do something different
            var height = getValue(X, yval-CUTOUT_MM/2);
            path.push( { "x": yval, "y": 0 } );
            path.push( { "x": yval, "y": (height / 2) } );
            path.push( { "x": (yval - CUTOUT_MM), "y": (height / 2) } );
            i++;
            yval = yvalues[i];
            path.push( { "x": yval, "y": 0 } );
        } else {
            path.push( { "x": yval, "y": 0 } );
        }
    }
    
    return { "type": "xSlice",
             "sliceVal": X,
             "min":  minY(path),
             "max":  maxY(path),
             "data": path };
}


function allTheXSlices() {
    var slices = [];
    for(var i = 0, x = 0; i < NUM_CUTS; i++) {
        x += CUTSPACING_MM;
        var aSlice = genXSlice(x);
        aSlice["dataOutput"] = aSlice.data.map(
            function(d) { d.x += (WIDTH_MM+5)*i; return d }
        );
        aSlice["path"] = pointsToLines(aSlice.data);
        slices.push(aSlice);
    }
    return slices;
}

function pathsFromSlices(slices) {
    return slices.map(function(d){return d.path});
}


// var s = allTheXSlices();
// console.log(s.map(function(d){return d.path})); //.map(function(d){console.log(d.path)});
// console.log(s);

// console.log(aSlice);

// console.log(path);

