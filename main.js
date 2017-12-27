
const pathWinCcminerX86 = 'https://github.com/tpruvot/ccminer/releases/download/2.2.3-tpruvot/ccminer-x86-2.2.3-cuda9.7z';

const electron = require('electron');
const url = require('url');
const path = require('path');
const si = require('systeminformation');
const fs = require('fs');
const request = require('request');
const nrc = require('node-run-cmd');

const {app, BrowserWindow, Menu, ipcMain} = electron;

// mining var

var miningUser = ' -u bf-az.donate'
var miningPool = ' -o stratum+tcp://us-east.stratum.slushpool.com:3333';
var miningAlgo = ' -a sha256';



// SET ENV
process.env.NODE_ENV = 'Dev';//production

let mainWindow,addWindow;
let { zip, unzip } = require('cross-unzip');

//listen for app to be ready
app.on('ready', function(){
    //load system
    //create new window
    mainWindow = new BrowserWindow({});//pass in empty object {} cause no configurations
    // load html into window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname,'mainWindow.html'),
        protocol:'file:',
        slashes: true
        //file://dirname/mainWindow.html
    })); 
    //quit app when closed
    mainWindow.on('closed', function(){
        app.quit();
    });

    // build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    //Insert Menu
    Menu.setApplicationMenu(mainMenu);

    //get CCminer
    //downloadFromInternet(pathWinCcminerX86,__dirname+'/miners/ccminer/','ccminer.7z');//unzips
});


//Handle  create add window
function createAddWindow(){
    //create new window
    addWindow = new BrowserWindow({
        width: 400,
        height: 400,
        title:'Add item'
    });
    // load html into window
    addWindow.loadURL(url.format({
        pathname: path.join(__dirname,'addWindow.html'),
        protocol:'file:',
        slashes: true
    })); 
    //garbage collection handle
    addWindow.on('close', function(){
            addWindow = null;
    });
}
//get system info
function getSystem(){
    //console.log(" Getting system info");
    si.cpu()
        .then(data => {
            mainWindow.webContents.send('system:info:cpu', data);
        })
        .catch(error => console.error(error)); 
        
    si.graphics()
    .then(data => {
        mainWindow.webContents.send('system:info:graphics', data);
    })
    .catch(error => console.error(error)); 
    
    si.networkInterfaces()
    .then(data => {  
        mainWindow.webContents.send('system:info:networkInterfaces', data);
    })
    .catch(error => console.error(error)); 
    
    si.currentLoad()
    .then(data => { 
        mainWindow.webContents.send('system:info:currentLoad', data);
    })
    .catch(error => console.error(error)); 
};



//Catch item:add
ipcMain.on('mining', function(e, miningData){
    console.log(miningData);
    mainWindow.webContents.send('mining', miningData);
    miningUser = miningData[0];
    miningPool = miningData[1];
    miningAlgo = miningData[2];
    addWindow.close();
});
ipcMain.on('startMining', function(e){
    console.log('startminging');
    var dataCallback = function(data) {
        console.log(data);
      };
      //['-a sha256','-o stratum+tcp://us-east.stratum.slushpool.com:3333 -a sha256 -o stratum+tcp://us-east.stratum.slushpool.com:3333 -u bf-az.donate','-u bf-az.donate']
    nrc.run(__dirname+'/miners/ccminer/ccminer-x64.exe'+miningAlgo+miningPool+miningUser,{ onData: dataCallback }, function(err,stderr) {
        console.log('Command failed to run with error: ', err);
        console.log('Command failed to run with stderr: ', stderr);
      });
});

// create menu template
const mainMenuTemplate = [
    {
        label: 'File',
        submenu:[
            {
                label: 'Add item',
                click(){
                    createAddWindow();
                }
            },
            {
                label: 'Clear items',
                click(){
                    mainWindow.webContents.send('item:clear')
                }
            },
            {
                label: 'Quit',
                accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click(){
                    app.quit();
                }
            }
        ]
    },
    {
        label: 'system',
        submenu:[
            {
                label: 'Get System Info',
                click(){
                    getSystem();
                }
            }
        ]
    }
];

//if mac, add empty object to menu
if(process.platform == 'darwin'){
    mainMenuTemplate.unshift({});
}

// Add developer tools item if not in prod
if(process.env.NODE_ENV !== 'production'){
    mainMenuTemplate.push({
        label: 'Developer tools',
        submenu:[
            {
                label: 'Toggle DevTools',
                accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',    
                click(item,focusedWindow){
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    });
}

function downloadFromInternet(url, dest,filename, cb) {
    var file = fs.createWriteStream(dest+filename);
    var sendReq = request.get(url);

    // verify response code
    sendReq.on('response', function(response) {
        if (response.statusCode !== 200) {
            return cb('Response status was ' + response.statusCode);
        }
    });

    // check for request errors
    sendReq.on('error', function (err) {
        fs.unlink(dest);
        return cb(err.message);
    });

    sendReq.pipe(file);

    file.on('finish', function() {
        file.close(cb);  // close() is async, call cb after close completes.
        unzip(dest+filename, dest, err => {
            
            console.log('finished unziping');
            fs.unlink(dest+filename);//remove zip
          })
    });

    file.on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        return cb(err.message);
    });
};