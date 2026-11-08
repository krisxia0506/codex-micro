// PG1353 reference drawing, rotated so the electrical pins point toward -Y.
// Deep Sea MINI-specific mould dimensions remain unverified: trial fit only.
export const keyRecessDepth=2;
export const switchSpec={
 family:'Kailh Deep Sea MINI / Choc V2',
 pins:[[-5,-3.8],[0,-5.9]], socketPins:[[-5,-3.8],[0,-6]],
 guides:[], auxiliaryHoles:[[5,5.15]],
 centerHole:5.2,guideHole:1.8,contactHole:3.3,
 postDiameter:4.8,pinLength:3,postLength:3.3,
 recessDepth:keyRecessDepth,carrierBottom:10-keyRecessDepth,carrierTop:11.5-keyRecessDepth,socketBottom:8.15-keyRecessDepth,
 bodyWidth:13.95,bodyHeight:5.3,stemTop:9,
 guardInnerDiameter:5.5,guardOuterDiameter:6.5,guardHeight:3.1,
 travel:2.8,maxTravel:3.05,
};
export const socketTerminals=[[-8.375,-3.8],[3.175,-6]];
