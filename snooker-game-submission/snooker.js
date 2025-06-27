var Engine = Matter.Engine;
var World = Matter.World;
var Bodies = Matter.Bodies;
var Body = Matter.Body;

//table dimensions adjust these variables will scale the table porportionally
var TABLE_HEIGHT = 900;
var homePage = true;
var gameChosen = '';
var engine;
var cueBall;
var slider;

// checks if the cue is in the pocket 
var chooseCuePos = true;
var cueInPocket = false;
var pocketedBalls = [];
var showError = false;
var lastCollision = "";
var walls = [];
var cushions = [];
var pockets = [];
var balls =[];
var coloredBalls ={};
var remainingBalls =0;
var messageTimer; 


var strikeCounter =0; //Striking counter when mouse pressed
var increment = 1;
var cue;
var constrainedMouseX;
var constrainedMouseY;

//scale the table  
var MAX_STRIKE;
var STRIKE_FACTOR;
var TABLE_LENGTH;
var ballDiameter;
var tableBorder;

// Max length on the line of the cue based on TABLE_HEIGHT, which varies from 400-900
function setup() {
    slider = createSlider(400,900,900);
    slider.position(50,height-50);
    slider.input(updateTableHeight);
    createCanvas(1000,650);
    adjustTableSize(TABLE_HEIGHT);
    engine = Engine.create();
	
    // Declare the gravity to 0, the cue balls move around without falling down the screen
    engine.world.gravity.y = 0;
    setupWalls();
    setUpCushion();
    setupPockets();
    cue = new Cue();
    generateBalls();
    generateColoredBalls();

}
function draw() {    
    background(220);
    drawTable();
    Engine.update(engine);
    drawWalls();
    drawCushion();
    drawBalls();
    drawColoredBalls();
    drawPockets();
    checkBallinPocket();
    drawPowerBar();
    collisionText();
    chooseMode();
    drawCueBall();
    allBallsPotted(balls,remainingBalls);

    //when press the mouse, strike counter increases
    if (mouseIsPressed && homePage == false ) {
        strikeCounter += increment;
        if (strikeCounter >= 100) {
            // If strikeCounter exceeds 100, set it to 100 and reverse the increment direction
            strikeCounter = 100;
            increment *= -1;
        } else if (strikeCounter <= 0) {
            // If strikeCounter goes below 0, set it to 0 and reverse the increment direction
            strikeCounter = 0;
            increment *= -1;
        }
    }

//Show error message if the player pot 2 consecutive colored balls
    if(showError){
        strokeWeight(2);
        stroke(0, 0, 0);
        fill(255);
        textSize(20);
        textAlign(CENTER, CENTER);
        text("CANNOT POT 2 COLORED BALLS IN A ROW", width / 2, height/2);
        text("Press the space bar to continue", width / 2, height/2 + 30);
    }

// draw white circle at mouse position 
    if (cueInPocket ||(chooseCuePos && homePage == false)) {
        var centerX = width / 2 - TABLE_LENGTH * 6 / 11;
        var centerY = height / 2;
        var radius = TABLE_LENGTH / 6;

        var x = mouseX;
        if (x > centerX) {
            x = centerX;
        }
        var y = mouseY;
        var dx = x - centerX;
        var dy = y - centerY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > radius) {
            var scale = radius / distance;
            dx *= scale;
            dy *= scale;
        }
        constrainedMouseX = centerX + dx;
        constrainedMouseY = centerY + dy;

        noStroke();
        fill(255);
        ellipse(constrainedMouseX, constrainedMouseY, ballDiameter * 2);
    }

}
//////////////Pocketing functions/////////////////////
function Pocket(x,y,r) {
        this.pos = new p5.Vector(x, y);
        this.r = r;
        this.show = function() {
            fill(0, 0, 0);
            noStroke();
            ellipse(this.pos.x, this.pos.y, this.r*2);
    }
}
function setupPockets(){
    //mid
    pockets.push(new Pocket(width/2, height/2 + TABLE_LENGTH/2, ballDiameter*1.5));
    pockets.push(new Pocket(width/2, height/2 - TABLE_LENGTH/2, ballDiameter*1.5));
    //left
    pockets.push(new Pocket(width/2 - TABLE_HEIGHT/2, height/2 + TABLE_LENGTH/2, ballDiameter*1.5));
    pockets.push(new Pocket(width/2 - TABLE_HEIGHT/2, height/2 - TABLE_LENGTH/2, ballDiameter*1.5));
	//right
    pockets.push(new Pocket(width/2 + TABLE_HEIGHT/2, height/2 + TABLE_LENGTH/2, ballDiameter*1.5));
    pockets.push(new Pocket(width/2 + TABLE_HEIGHT/2, height/2 - TABLE_LENGTH/2, ballDiameter*1.5));

}
function drawPockets(){
    if(!homePage){    
    for(var i =0; i < pockets.length; i++){
        pockets[i].show();
    }    

}
}
function ballInPocket(ball, pocket, coloredBallInfo) {
    //check if the ball is within the pocket
    if (ball && pocket) {
        // Calculate the distance between the ball and the pocket center
        var distance = dist(ball.position.x, ball.position.y, pocket.pos.x, pocket.pos.y);
    // Check if the red  ball's edge has crossed into the pocket's circumference
        if (distance < pocket.r *1.1 && coloredBallInfo == 0) {
            console.log("Pocketed the red ball")
            var ballIndex = balls.indexOf(ball);
            if (ballIndex !== -1) {
                // Remove the ball from the physics world and the balls array
                console.log("removing the red ball from the world");
                World.remove(engine.world, ball);
                balls.splice(ballIndex, 1);
                //record colored ball in pocket 
                pocketedBalls.push('red');
            }
        }
    //check if the cueball has crossed into the pocket's circumference
        else if (distance < pocket.r *1.1 && coloredBallInfo == 1) {
            cueInPocket = true;
            console.log("cue ball is in pocket, removing cue ball")
            World.remove(engine.world, ball);
        }
        
        //check if the colored ball's edge has crossed into the pocket's circumference
        else if (distance < pocket.r * 1.1  && coloredBallInfo != 0 && coloredBallInfo != 1) {
            // Reset the ball to its original position
            if(balls.length != 0){
                pocketedBalls.push("colored");
                resetColoredBall(coloredBallInfo);
    
            }
            else if (balls.length ==0){
                var coloredBall = coloredBallInfo.body;
                World.remove(engine.world, coloredBall);
                Body.setPosition(coloredBall, { x: 0, y:- height/10});

                remainingBalls += 1;
            }
        }
}
}

//////////////Ball functions /////////////////////
function generateBalls() {
    // Number of columns in the triangle
    if(homePage){
    var numColumns = 5; 

    for (var column = 0; column < numColumns; column++) {
        for (var row = 0; row <= column; row++) {
            var ball = Bodies.circle(width/2 + TABLE_HEIGHT * 0.2 + column * ballDiameter *2, row * ballDiameter *2 + height/2 - column * ballDiameter, ballDiameter, { restitution: 1, friction: 1 });
            balls.push(ball);
        }
    }

    World.add(engine.world, balls);
    }
}
function drawBalls(){
    fill(220, 41, 54);
    for(var i =0; i < balls.length; i++){
        drawVertices(balls[i].vertices);
}
}
function generateColoredBalls() {
    // Other balls that are not red
    coloredBalls.blueBall = {
        body: Bodies.circle(width / 2, height / 2, ballDiameter, { restitution: 1, friction: 1 }),
        ballsPos: { x: width / 2, y: height / 2 }
    };
    coloredBalls.blackBall = {
        body: Bodies.circle(width / 2 + TABLE_HEIGHT * 0.4, height / 2, ballDiameter, { restitution: 1, friction: 1 }),
        ballsPos: { x: width / 2 + TABLE_HEIGHT * 0.4, y: height / 2 }
    };
    coloredBalls.pinkBall = {
        body: Bodies.circle(width / 2 + TABLE_HEIGHT * 0.2 - ballDiameter * 2, height / 2, ballDiameter, { restitution: 1, friction: 1 }),
        ballsPos: { x: width / 2 + TABLE_HEIGHT * 0.2 - ballDiameter * 2, y: height / 2 }
    };
    coloredBalls.greenBall = {
        body: Bodies.circle(width / 2 - TABLE_LENGTH * 6 / 11, height / 2 + TABLE_LENGTH / 6, ballDiameter, { restitution: 1, friction: 1 }),
        ballsPos: { x: width / 2 - TABLE_LENGTH * 6 / 11, y: height / 2 + TABLE_LENGTH / 6 }
    };
    coloredBalls.brownBall = {
        body: Bodies.circle(width / 2 - TABLE_LENGTH * 6 / 11, height / 2, ballDiameter, { restitution: 1, friction: 1 }),
        ballsPos: { x: width / 2 - TABLE_LENGTH * 6 / 11, y: height / 2 }
    };
    coloredBalls.yellowBall = {
        body: Bodies.circle(width / 2 - TABLE_LENGTH * 6 / 11, height / 2 - TABLE_LENGTH / 6, ballDiameter, { restitution: 1, friction: 1 }),
        ballsPos: { x: width / 2 - TABLE_LENGTH * 6 / 11, y: height / 2 - TABLE_LENGTH / 6 }
    };
    World.add(engine.world, [
        coloredBalls.blueBall.body,
        coloredBalls.blackBall.body,
        coloredBalls.pinkBall.body,
        coloredBalls.yellowBall.body,
        coloredBalls.brownBall.body,
        coloredBalls.greenBall.body
    ]);
}
function drawColoredBalls() {
    // Blue ball
    fill(0, 0, 230);
    drawVertices(coloredBalls.blueBall.body.vertices);
    // Black ball
    fill(0);
    drawVertices(coloredBalls.blackBall.body.vertices);
    // Pink ball
    fill(255, 182, 193);
    drawVertices(coloredBalls.pinkBall.body.vertices);
    // Green ball
    fill(0, 230, 0);
    drawVertices(coloredBalls.greenBall.body.vertices);
    // Brown ball
    fill(139, 69, 19);
    drawVertices(coloredBalls.brownBall.body.vertices);
    // Yellow ball
    fill(230, 230, 0);
    drawVertices(coloredBalls.yellowBall.body.vertices);
}
function resetColoredBall(coloredBallInfo) {
    var coloredBall = coloredBallInfo.body;
    World.remove(engine.world, coloredBall);

    if(balls.length > 0)
    {
        // Set velocity and angular velocity to zero
        Body.setVelocity(coloredBall, { x: 0, y: 0 });
        Body.setAngularVelocity(coloredBall, 0);
        var xPos = random(width / 2 - TABLE_LENGTH / 2 + ballDiameter, width / 2 + TABLE_LENGTH / 2 - ballDiameter);
        var yPos = random(height / 2 - TABLE_LENGTH / 2 + ballDiameter, height / 2 + TABLE_LENGTH / 2 - ballDiameter);
    
        if(gameChosen == '3')
        {
            Body.setPosition(coloredBall, {
                x: xPos,
                y: yPos
            });

        }
        else{
            Body.setPosition(coloredBall, {
                x: coloredBallInfo.ballsPos.x,
                y: coloredBallInfo.ballsPos.y
            });
        }
        World.add(engine.world, coloredBall);
            // Check if the last pocketed ball was colored
        if(pocketedBalls.length >=2)
        {
            // Get the last two elements
            const lastElement = pocketedBalls[pocketedBalls.length - 1];
            const secondLastElement = pocketedBalls[pocketedBalls.length - 2];
            // Compare the last two elements
                if(lastElement == secondLastElement){
                    showError = true;
                    console.log("show error is true")}
                else{
                    showError = false;}
        } 
        else {
                console.log('Array must have at least two elements.');
                return false;
             }
    }
}
function checkBallinPocket() {

    if(cueBall){
    // Check if any red ball is in a pocket
    for(var i =0; i< balls.length; i++){
        for(var j =0; j<pockets.length; j++){
            ballInPocket(balls[i],pockets[j],0)
        }
    }
    // Check if any colored ball is in a pocket
    for (var ballType in coloredBalls) {
        for (var j = 0; j < pockets.length; j++) {
            ballInPocket(coloredBalls[ballType].body, pockets[j], coloredBalls[ballType]);
        }
    }
    
    // Check if cue ball is in a pocket
    for(var i =0; i < pockets.length; i++){
            ballInPocket(cueBall, pockets[i], 1);
        }
    
    //when ball is going to stop, then draw line
    if(cueBall.speed <= 0.3){
        drawForceLine();
    }
        cue.move(cueBall,mouseX,mouseY);
        cue.show();
    }

}
function checkCollisions(A, B) {
    if(A && B)
    {
    var collisionPairs = Matter.Query.collides(A, [B]);
    if (collisionPairs.length > 0) {
        // Collision detected
        return true;
    } else {
        // No collision
        return false;
    }
    }

}
function collisionText() {
    // Check for collisions with colored balls
    for (var i in coloredBalls) {
        if (checkCollisions(cueBall, coloredBalls[i].body)) {
            lastCollision = "Cue last collided with: " +i;
            
        }
    }
    //check for collisions with red balls
    for (var i =0; i<balls.length; i++) {
        var redBall = balls[i];
        if (checkCollisions(cueBall, balls[i])) {
            lastCollision = "Cue last collided with: red ball";
        }
    }
    // Check for collisions with cushions
    for (var j = 0; j < cushions.length; j++) {
        if (checkCollisions(cueBall, cushions[j])) {
            lastCollision = "Cue last collided with: cushion";
        }
    }
    if(lastCollision != ""){
        strokeWeight(2);
        stroke(255)
        fill(0);
        textSize(22);
        textAlign(CENTER, CENTER);
        text(lastCollision, width/2, height/15);
    }
}

//////////////CUEBALL FUNCTIONS/////////////////////
function generateCueBall(x, y) {
    // Set the initial position of the cue ball based on the mouse coordinates
    cueBall = Bodies.circle(x, y, ballDiameter, { restitution: 1, friction: 1 });    
    World.add(engine.world, [cueBall]);
}

function drawCueBall(){
    if(cueInPocket == false && chooseCuePos == false &&cueBall.vertices)
    {
        fill(255);
        drawVertices(cueBall.vertices);    
    }
    else {
        return false;
                console.error("Cue ball object is not properly initialized.");

    }
}
//Drawing a line from a mouse to the cue ball
function drawForceLine(){
    if(cueInPocket == false && chooseCuePos == false)
    {   
        strokeWeight(2);
        stroke(255,255,255,150);
    }
}

//////////////WALL AND TABLE FUNCTIONS/////////////////////
function setupWalls(){
    //top wall
    var wall1 = Bodies.rectangle(ballDiameter/6 + width/2 - TABLE_LENGTH/2, height/2 - TABLE_LENGTH/2 - tableBorder/2, TABLE_HEIGHT/2 - ballDiameter*3, tableBorder,{isStatic:true});
    var wall2 = Bodies.rectangle(ballDiameter/6 + width/2 + TABLE_LENGTH/2,  height/2 - TABLE_LENGTH/2 - tableBorder/2, TABLE_HEIGHT/2 - ballDiameter*3, tableBorder,{isStatic:true});
    //bottom wall
    var wall3 = Bodies.rectangle(ballDiameter/6 + width/2 - TABLE_LENGTH/2, height/2 + TABLE_LENGTH/2 + tableBorder/2,TABLE_HEIGHT/2 - ballDiameter*3, tableBorder,{isStatic:true});
    var wall4 = Bodies.rectangle(ballDiameter/6 + width/2 + TABLE_LENGTH/2, height/2 + TABLE_LENGTH/2 + tableBorder/2,TABLE_HEIGHT/2 - ballDiameter*3, tableBorder,{isStatic:true});   
    //right wall
    var wall5 = Bodies.rectangle(width/2 + TABLE_LENGTH + tableBorder/2 +ballDiameter/3, height/2, tableBorder, TABLE_LENGTH - ballDiameter*2,{isStatic:true});
    //left wall
    var wall6 = Bodies.rectangle(width/2 - TABLE_LENGTH - tableBorder/2 - ballDiameter/3, height/2, tableBorder, TABLE_LENGTH - ballDiameter*2,{isStatic:true});
    walls.push(wall1);
    walls.push(wall2);
    walls.push(wall3);
    walls.push(wall4);
    walls.push(wall5);
    walls.push(wall6);
    World.add(engine.world,[wall1,wall2,wall3,wall4,wall5,wall6]);

}
function drawWalls(){
    if(!homePage){
    noStroke();
    fill(255,223,0)
    // //mid
    fill(94,40,36);
    for(var i = 0; i<walls.length; i++){
        drawVertices(walls[i].vertices);
    }
}
}
function setUpCushion() {
    //top cushions
    var cushion1 = Bodies.trapezoid(
        ballDiameter / 6 + width / 2 - TABLE_LENGTH / 2,
        height / 2 - TABLE_LENGTH / 2 - tableBorder / 2 + ballDiameter *1.3,
        TABLE_HEIGHT / 2 - ballDiameter * 6.1,
        tableBorder,
        -0.1,{ isStatic: true,restitution: 1}
    );

    var cushion2 = Bodies.trapezoid(
        ballDiameter / 6 + width / 2 + TABLE_LENGTH / 2,
        height / 2 - TABLE_LENGTH / 2 - tableBorder / 2 + ballDiameter *1.3,
        TABLE_HEIGHT / 2 - ballDiameter * 6,
        tableBorder,
        -0.1, { isStatic: true,restitution: 1}
    );

    //bottom cushions
    var cushion3 = Bodies.trapezoid(
        ballDiameter / 6 + width / 2 - TABLE_LENGTH / 2,
        height / 2 + TABLE_LENGTH / 2 + tableBorder / 2 - ballDiameter *1.3,
        TABLE_HEIGHT / 2 - ballDiameter * 3,
        tableBorder,
        0.1,{ isStatic: true,restitution: 1}
    );
    var cushion4 = Bodies.trapezoid(
        ballDiameter / 6 + width / 2 + TABLE_LENGTH / 2,
        height / 2 + TABLE_LENGTH / 2 + tableBorder / 2- ballDiameter * 1.3,
        TABLE_HEIGHT / 2 - ballDiameter * 3,
        tableBorder,
        0.1,{ isStatic: true,restitution: 1}
    );

// right cushion (trapezoid)
var cushion5 = Bodies.fromVertices(
    width / 2 + TABLE_LENGTH + tableBorder / 2 - ballDiameter,
    height / 2,
    [
        { x: 0, y: -TABLE_LENGTH /2.2  + ballDiameter*2},
        { x: 0, y: TABLE_LENGTH / 2.2 - ballDiameter*2},
        { x: tableBorder, y: TABLE_LENGTH / 2 - ballDiameter },
        { x: tableBorder, y: -TABLE_LENGTH / 2 + ballDiameter }
    ],
    { isStatic: true,restitution: 1}
    
);

// left cushion (trapezoid)
var cushion6 = Bodies.fromVertices(
    width / 2 - TABLE_LENGTH - tableBorder / 2 + ballDiameter,
    height / 2,
    [
        { x: tableBorder, y: -TABLE_LENGTH /2.2  + ballDiameter*2 },
        { x: tableBorder, y: TABLE_LENGTH / 2.2 - ballDiameter*2},
        { x: 0, y: TABLE_LENGTH / 2 - ballDiameter},
        { x: 0, y: -TABLE_LENGTH / 2 + ballDiameter}
    ],
    { isStatic: true,restitution: 1}
);  
    cushions.push(cushion1);
    cushions.push(cushion2);
    cushions.push(cushion3);
    cushions.push(cushion4);
    cushions.push(cushion5);
    cushions.push(cushion6);
    World.add(engine.world,[cushion1,cushion2,cushion3,cushion4,cushion5,cushion6]);

}
function drawCushion() {
    if(!homePage){
    noStroke();
    fill(5,102,8);
    for(var i = 0; i<cushions.length; i++){
        drawVertices(cushions[i].vertices);
    }
}
}
function drawTable() {
    //function to draw table felt
    fill(39, 119, 20);
    rectMode(CENTER);
    rect(width / 2, height / 2, TABLE_HEIGHT, TABLE_LENGTH);
    // Draw a white line at 1/4 of the table
    stroke(255);
    strokeWeight(1);
    line(width/2 - TABLE_LENGTH* 6/11, height/2 - TABLE_LENGTH/2, width/2 - TABLE_LENGTH* 6/11, height/2 + TABLE_LENGTH/2);
    //Draw semicircle on the left side of table
    arc(width/2 - TABLE_LENGTH * 6/11, height/2, TABLE_LENGTH/3, TABLE_LENGTH/3, PI/2, 3*PI/2);

}
//////////////GAME FUNCTIONS /////////////////////
function chooseMode(){
    if(homePage){
        strokeWeight(3);
        stroke(0);
        fill(255);
        textSize(40);
        textAlign(CENTER, CENTER);
        text("SNOOKER ", width / 2, height/2 - 30);
        textSize(15);
        text("Adjust the slider to the size you prefer before ", width / 2, height/2 + 30);
        text("Choosing a game mode by keying the mode's respective numbers ", width / 2, height/2 + 45);
        text("[1]: Normal  |  [2]: Red random  |  [3]: All random", width / 2, height/2 + 75);

        if(gameChosen == '1'){
            homePage = false;
            cueInPocket = true;
        }
        else if (gameChosen == '2'){
            homePage = false;
            cueInPocket = true;
            randomiseRedBalls();
        }
        else if (gameChosen == '3'){
            homePage = false;
            cueInPocket = true;
            randomiseAllBalls();
        }
    }
}
function randomiseRedBalls() {
        for (var i = 0; i < balls.length; i++) {
            var xPos = random(width / 2 - TABLE_LENGTH / 2 + ballDiameter, width / 2 + TABLE_LENGTH / 2 - ballDiameter);
            var yPos = random(height / 2 - TABLE_LENGTH / 2 + ballDiameter, height / 2 + TABLE_LENGTH / 2 - ballDiameter);
            Body.setPosition(balls[i], { x: xPos, y: yPos });
        }
}
function randomiseAllBalls() {
    // Loop through all balls (both red and colored) and set their positions randomly within the table
    for (var i = 0; i < balls.length; i++) {
        var xPos = random(width / 2 - TABLE_LENGTH / 2 + ballDiameter, width / 2 + TABLE_LENGTH / 2 - ballDiameter);
        var yPos = random(height / 2 - TABLE_LENGTH / 2 + ballDiameter, height / 2 + TABLE_LENGTH / 2 - ballDiameter);
        Body.setPosition(balls[i], { x: xPos, y: yPos });
    }
    // Loop through colored balls and set their positions randomly within the table
    for (var ballType in coloredBalls) {
        var coloredBall = coloredBalls[ballType].body;
        var xPosColored = random(width / 2 - TABLE_LENGTH / 2 + ballDiameter, width / 2 + TABLE_LENGTH / 2 - ballDiameter);
        var yPosColored = random(height / 2 - TABLE_LENGTH / 2 + ballDiameter, height / 2 + TABLE_LENGTH / 2 - ballDiameter);
        Body.setPosition(coloredBall, { x: xPosColored, y: yPosColored });
    }
}
//Illustrate how much power the player is shooting the cue
function drawPowerBar(){
    if (showError == false && homePage == false){
    strokeWeight(2);
    stroke(255);
    fill(0);
    textSize(16);
    textAlign(CENTER, CENTER);
    text("Cue Power", width / 2, height - 20);
    var power = map(strikeCounter,0,100,0,1);
    noStroke();
    rectMode(CORNER);
    fill(100);
    //background of bar
    rect(width/2 - 100, 600,200,20);
    rectMode(CORNER);
    fill(255);
    rect(width/2 - 100, 600,200 * power,20);
    console.log(STRIKE_FACTOR);
}

}
function allBallsPotted(balls) {
    strokeWeight(3);
    stroke(255);
    fill(0);
    textAlign(CENTER, CENTER);
    if(balls.length == 0){
        if (!messageTimer) {
        // Set the initial time when all red balls are potted
            messageTimer = millis();
          }
        var elapsedTime = millis() - messageTimer;
        if(elapsedTime < 3000){
       // Display a message to prompt  player to pot the colored balls
        textSize(24);
        text("You potted all red balls! Now pot the colored balls.", width / 2, height / 2);
        }
        else if(balls.length ==0 && remainingBalls ==6){
            console.log(remainingBalls)
            textSize(35);
            text("Congratulations! You potted all the balls!", width / 2, height / 2);
        }
        else {
            return;
        }
    }
}
function updateTableHeight() {
    TABLE_HEIGHT = slider.value();
    adjustTableSize(TABLE_HEIGHT);
}

function adjustTableSize(tableHeight){
    TABLE_HEIGHT = tableHeight;
    TABLE_LENGTH = TABLE_HEIGHT / 2;
    ballDiameter = TABLE_LENGTH / 36;
    tableBorder = ballDiameter * 34 / 25;
    MAX_STRIKE = Math.max(0.04 * Math.pow(0.95, 900 - TABLE_HEIGHT), 0.005);
    STRIKE_FACTOR = Math.max(0.008 * Math.pow(0.95, 900 - TABLE_HEIGHT), 0.005);

}

function removeAndAdd(){
        if(homePage){
        walls = [];
        cushions = [];
        pockets = [];
        for (var ballType in coloredBalls) {
            World.remove(engine.world, coloredBalls[ballType].body);
        }
        for (var i = 0; i < balls.length; i++) {
            World.remove(engine.world, balls[i]);
        }
        balls = [];

    
    generateColoredBalls();
    drawColoredBalls();
    generateBalls();
    drawBalls();
    setUpCushion();
    drawCushion();
    setupPockets();
    drawPockets();
    setupWalls();
    drawWalls();
    }
    else{
        return
    }
}

//creating a force that the player decides 
function mousePressed(){
    if(showError == false && chooseCuePos == false)
    {
            mouseIsPressed = true;
    }    
}
//releasing the force into a strike  to the cue ball
function mouseReleased() {
    if (showError == false && homePage == false && cueBall && cueBall.speed <= 0.3) {
        var strikeSpeed = map(strikeCounter, 0, 100, 0, MAX_STRIKE);
        cue.strike(cueBall, strikeSpeed);
        strikeCounter = 0;
    } else {
        strikeCounter = 0;
    }
}

function mouseClicked(chooseCuePos) {

    if ((chooseCuePos && cueInPocket && showError == false)|| (chooseCuePos == false && homePage == false)) {
        // Call generateCueBall with the mouse coordinates when the mouse is clicked
        generateCueBall(constrainedMouseX, constrainedMouseY);
        console.log ("cue ball generated");
        drawCueBall()
        cueInPocket = false;
        chooseCuePos = true;
    }

}

function keyPressed() {
    if(key == ' '){
        showError = false;
    }
    if (key == '1'){
        drawCueBall();    
        removeAndAdd();
        gameChosen = '1'
        chooseCuePos = false;
        console.log('1 is pressed')
    }
    if(key == '2'){
        drawCueBall();
        removeAndAdd();
        gameChosen = '2'
        chooseCuePos = false;
        console.log('2 is pressed')
    }
    if(key == '3'){
        drawCueBall();
        removeAndAdd();
        gameChosen = '3'
        chooseCuePos = false;
        console.log('3 is pressed')
    }
}

function Cue() {
    this.begin = new p5.Vector();
    this.direction = new p5.Vector(0, 0);

    //draws cueball line 
    this.move = function(cueBall, mouseX, mouseY) {
        // To move the cue we set its position to the one of the white ball
        // Its direction is set according to the position of the mouse and its magnitude is capped
        this.begin = createVector(cueBall.position.x, cueBall.position.y); 
        var end = createVector(mouseX, mouseY);
        this.direction = p5.Vector.sub(end, this.begin);
        this.direction.limit(TABLE_HEIGHT);
        }

    this.show = function() {
        // line from ball to the mouse
        line(this.begin.x, this.begin.y, this.begin.x + this.direction.x, this.begin.y + this.direction.y);
        fill(255,255,255,100);
        ellipse(this.begin.x + this.direction.x, this.begin.y + this.direction.y, ballDiameter, ballDiameter);

    }

    this.strike = function(ball, strikeSpeed) {
        var direction = this.direction.copy();
        direction.div(STRIKE_FACTOR);
    
        // Adjust the force based on the strikeSpeed
        direction.setMag(strikeSpeed);
        Body.applyForce(ball, ball.position, {x: direction.x, y: direction.y});
    }
        
}

function drawVertices(vertices)
{
    beginShape();
    for(var i =0; i < vertices.length;i++)
    {
     vertex(vertices[i].x, vertices[i].y);   
    }
    endShape(CLOSE);
}

////////////////////////COMMENTARY///////////////////////////

// In this game, players use the mouse to move the white cue ball around, particularly within a semicircle area at one end of the table, just like in real snooker. This mechanic was chosen for its intuitive nature, mirroring the physical movement of placing the cue ball on a snooker table. Additionally, the cue ball gameplay is mouse-based, while other aspects such as error messages and game mode selection require the keyboard. This ensures that users read the instructions instead of instinctively clicking on items.

// When aiming to hit the cue ball, players use the mouse to point in the desired direction, which is the most effective way to control the cue ball's direction. A cue power function is included, where the power depends on how long the user holds down the mouse button. Players must release the mouse button at the right moment to achieve the desired power. The power meter is displayed at the bottom, requiring players to hold and watch to gauge the exact shot.

// The game provides feedback on the interaction between the cue ball and its surroundings, crucial for planning the next move. This interaction feedback is placed at the top of the table, as users will naturally look at the top of the screen for information.

// An extension feature of this game is a slider that allows players to adjust the table size. All table features are scaled and drawn based on a single value, the table's height. Changing this value proportionately scales the table size, making it a unique feature that caters to users with different devices, allowing them to choose the optimal size for gameplay. This feature adds an element of fun not possible in real life, making the game easier or harder as desired.

// The game adheres to real snooker rules. For instance, players can't pot two colored balls consecutively. Violating this rule triggers an error message that remains until the player acknowledges it by pressing a key. The game also displays messages when players reach certain milestones, such as potting all red balls, and congratulates players at the end. A three-second automated timer is included when all balls are potted, allowing time for the player to read the message without needing further interaction.

// The combination of mouse-based gameplay and the table size adjustment slider makes this snooker game both accessible and enjoyable while maintaining the feel of real snooker. These features create a game that's engaging and unique, offering varied ways to play and learn.