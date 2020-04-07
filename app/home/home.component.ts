import { ViewChild } from "@angular/core";
import { RadSideDrawerComponent, SideDrawerType } from "nativescript-ui-sidedrawer/angular";
import * as accelerometer from "nativescript-accelerometer";
import { Component, OnInit } from "@angular/core";
import { interval, Subscription } from 'rxjs';
import * as app from "application";
import { knownFolders, path, File, Folder } from "tns-core-modules/file-system";
import { getFile } from 'tns-core-modules/http';
import * as fileSystem from "tns-core-modules/file-system";
import { isAndroid } from "tns-core-modules/platform";
import { alert } from "tns-core-modules/ui/dialogs";

const httpModule = require("tns-core-modules/http");
const Observable = require("tns-core-modules/data/observable-array").ObservableArray;

import { ItemEventData } from "tns-core-modules/ui/list-view"
var Sqlite = require("nativescript-sqlite");
declare var android;

let accelerometerListening = false;
let gaugeView = false;
let lineView = false;

let db = false;
let sideDrawerVis = false;
let toggleBarLabels = false;

@Component({
    selector: "Home",
    moduleId: module.id,
    templateUrl: "./home.component.html",
    styleUrls: ["./home.component.css"]
})

export class HomeComponent implements OnInit {
    vibrationMin: number;
    vibrationMax: number;
    temperatureMin: number;
    temperatureMax: number;
    soundMin: number;
    soundMax: number;
    pressureMin: number;
    pressureMax: number;
    humidityMin: number;
    humidityMax: number;

    pause: boolean;
    vibrationLine: boolean;
    temperatureLine: boolean;
    noiseLine: boolean;

    subscription: Subscription;
    subscriptionUI: Subscription;
    subscriptionESP: Subscription;
    intervalId: number;
    intervalIdUI: number;
    intervalIdESP: number;
    gaugeView: boolean;
    lineView: boolean;
    threshold: boolean;
    currentView: string;

    lineGraphTime: string;
    lineGraphTimeNum: number;
    lineGraphTicks: string;
    lineGraphHeight: string;
    vibrationHeight: string; vibrationVisible: boolean;
    temperatureHeight: string; temperatureVisible: boolean;
    noiseHeight: string; noiseVisible: boolean;

    stateUI: string;
    statusUI: string;
    menu: boolean;

    rawJSONStream: any;

    vibrationStatus: string;
    temperatureStatus: string;
    noiseStatus: string;
    pressureStatus: string;
    humidityStatus: string;

    x0: any;
    x1: any;
    x2: any;
    x3: any;
    x4: any;
    x5: any;

    data_db: any;
    db_container: any;
    data_points: any;

    timeValues: any;
    vibrationValues: any;
    temperatureValues: any;
    noiseValues: any;
    airValues: any;
    humidityValues: any;

    private database: any;
    public measurements: Array<any>;
    public measurementsUI: Array<any>;

    categoricalSource = [
        { Sensor: "Vibration", Amount: 0 },
        { Sensor: "Temperature", Amount: 0 },
        { Sensor: "Noise Level", Amount: 0 },
        { Sensor: "Air Pressure", Amount: 0 },
        { Sensor: "Humidity", Amount: 0 }
    ];
    categoricalSource2: { time: number, vibration: number, temperature: number, noise: number, pressure: number, humidity: number }[] = [
        { time: 0, vibration: 0, temperature: 0, noise: 0, pressure: 0, humidity: 0 },
        { time: 1, vibration: 0, temperature: 0, noise: 0, pressure: 0, humidity: 0 },
        { time: 2, vibration: 0, temperature: 0, noise: 0, pressure: 0, humidity: 0 },
        { time: 3, vibration: 0, temperature: 0, noise: 0, pressure: 0, humidity: 0 },
        { time: 4, vibration: 0, temperature: 0, noise: 0, pressure: 0, humidity: 0 }

    ];

    changeViews(): void {
        if (this.currentView == "View: No Data") {
            this.currentView = "View: Bar Graph";
        } else if (this.currentView == "View: Bar Graph") {
            this.gaugeView = !this.gaugeView;
            this.currentView = "View: Gauge";
        } else if (this.currentView == "View: Gauge") {
            this.lineView = !this.lineView;
            this.gaugeView = !this.gaugeView;
            this.currentView = "View: Time Domain";
        } else {
            this.currentView = "View: Bar Graph";
            this.lineView = !this.lineView;
            toggleBarLabels = !toggleBarLabels;
        }
    }

    startSensors(): void {

        if (this.x0 == undefined) { // Condition tracking the first time the app is started after opening

            this.stateUI = "Pause Screen"; // Set the UI state to play, set button label to "Pause"
            this.currentView = "View: Bar Graph"; // Initiate the UI view to "Bar Graph"
            this.x0 = 0; // Set the first start tracking variable to something defined

            // Initiate and start each individual thread all three functions
            const sourceESP = interval(1000); // Set a 1 second interval (1000ms)
            this.subscriptionESP = sourceESP.subscribe(val => this.opensnackESP());
            this.intervalIdESP = setInterval(this.opensnackESP(), 100000);

            const source = interval(2000); // Set a 2 second interval (2000ms)
            this.subscription = source.subscribe(val => this.opensnack());
            this.intervalId = setInterval(this.opensnack(), 100000);

            const sourceUI = interval(2000); // Set a 2 second interval (2000ms)
            this.subscriptionUI = sourceUI.subscribe(val => this.opensnackUI());
            this.intervalIdUI = setInterval(this.opensnackUI(), 100000);

        } else { // Executes if the start button is pressed but has been pressed in the past

            // Stop all threads
            this.subscriptionESP && this.subscriptionESP.unsubscribe();
            clearInterval(this.intervalIdESP);

            this.subscription && this.subscription.unsubscribe();
            clearInterval(this.intervalId);

            this.subscriptionUI && this.subscriptionUI.unsubscribe();
            clearInterval(this.intervalIdUI);

            // Reset all threads
            const sourceESP = interval(1000); // Set a 2 second interval (2000ms)
            this.subscriptionESP = sourceESP.subscribe(val => this.opensnackESP());
            this.intervalIdESP = setInterval(this.opensnackESP(), 100000);

            const source = interval(2000); // Set a 2 second interval (2000ms)
            this.subscription = source.subscribe(val => this.opensnack());
            this.intervalId = setInterval(this.opensnack(), 100000);

            const sourceUI = interval(2000); // Set a 2 second interval (2000ms)
            this.subscriptionUI = sourceUI.subscribe(val => this.opensnackUI());
            this.intervalIdUI = setInterval(this.opensnackUI(), 100000);

        }
    }

    stopSensors(): void {
        this.backup();
        this.review();
        try {
            alert('Data has been backed up.\nProcessess are now being stopped');
            this.subscription && this.subscription.unsubscribe();
            clearInterval(this.intervalId);

            this.subscriptionUI && this.subscriptionUI.unsubscribe();
            clearInterval(this.intervalIdUI);

            this.subscriptionESP && this.subscriptionESP.unsubscribe();
            clearInterval(this.intervalIdESP);

        } catch{
            alert('System processes have already been stopped');
            console.log('Stop button pressed multiple times, disregarding duplicate events');
        }
    }



    public insert() { // Insert into database from the ESP JSON object

        /* Uncomment this to insert random variables instead of connecting to ESP
               this.x0 = this.x0;
               this.x1 = Math.floor(Math.random() * (15 - 25) + 15);
               this.x2 = Math.floor(Math.random() * (25 - 35) + 25);
               this.x3 = Math.floor(Math.random() * (25 - 35) + 25);
               this.x4 = Math.floor(Math.random() * (25 - 35) + 25);
               this.x5 = Math.floor(Math.random() * (25 - 35) + 25);
               //this.x0 = this.x0 + 1;
       */
        
        // Comment out the below section is only using random values from above code
        
        var JSONObject = JSON.parse(this.rawJSONStream); // Parse the JSON object sent from the ESP in HTTP
        // Set global variables to each sensor value in the JSON object
        this.x0 = JSONObject["time"];
        this.x1 = JSONObject["vibration"];
        this.x2 = JSONObject["temperature"];
        this.x3 = JSONObject["sound"];
        this.x4 = JSONObject["pressure"];
        this.x5 = JSONObject["humidity"];
        // Commend out to here if necessary

        // Create date and time to append to JSON data
        var currentDate = new Date();
        var timestamp = currentDate.getTime();
        var year = currentDate.getFullYear() + "-" + (currentDate.getMonth() + 1) + "-" + currentDate.getDate();
        var time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds() + "." + (currentDate.getTime() % 1000);

        // Insert JSON data and date and time into database
        this.database.execSQL("INSERT INTO measurements_SSS (dateValues, timeValues, vibrationValues,temperatureValues,noiseValues,airValues,humidityValues, timing) VALUES (?,?,?,?,?,?,?,?)", [year, this.x0, this.x1, this.x2, this.x3, this.x4, this.x5, timestamp]).then(id => {
            this.fetch();
        }, error => {
            console.log("Error inserting into db: ", error)
        });

    }

    public fetch() {
        this.measurements = [];

        this.database.all("SELECT * FROM measurements_SSS ").then(rows => {

            this.measurements.push({
                "dateValues": rows[rows.length - 1][1],
                "timeValues": rows[rows.length - 1][2],
                "vibrationValues": rows[rows.length - 1][3],
                "temperatureValues": rows[rows.length - 1][4],
                "noiseValues": rows[rows.length - 1][5],
                "airValues": rows[rows.length - 1][6],
                "humidityValues": rows[rows.length - 1][7]
            });
        }, error => {
            console.log("Fetching error: ", error)
        });


    }

    public fetchUIData() { // Fetch Function for UI Elements

        this.database.all("SELECT * FROM measurements_SSS ").then(rows => {

            this.db_container = []; // Create an empty array to store past sensor values locally, each index is one unit time
            this.data_db = [0, 0, 0, 0, 0, 0]; // Create and populate array with zeros to store each unit time with sensor values

            for (let i = 0; i < rows.length; i++) { // Iterate through all rows of database
                this.data_db = [];
                this.data_db.push(rows[i][1], rows[i][2], rows[i][3], rows[i][4], rows[i][5], rows[i][6], rows[i][7]); // Populate array with sensor values
                this.db_container.unshift(this.data_db); // Populate container with sensor data, newest data at front

                // Threshold logic for changing visual indicator of min and max thresholds
                if (this.data_db[2] >= this.vibrationMin && this.data_db[2] < this.vibrationMax) {
                    this.vibrationStatus = "Yellow";
                } else if (this.data_db[2] >= this.vibrationMax) {
                    this.vibrationStatus = "Red";
                } else {
                    this.vibrationStatus = "White";
                }

                if (this.data_db[3] >= this.temperatureMin && this.data_db[3] < this.temperatureMax) {
                    this.temperatureStatus = "Yellow";
                } else if (this.data_db[3] >= this.temperatureMax) {
                    this.temperatureStatus = "Red";
                } else {
                    this.temperatureStatus = "White";
                }

                if (this.data_db[4] >= this.soundMin && this.data_db[4] < this.soundMax) {
                    this.noiseStatus = "Yellow";
                } else if (this.data_db[4] >= this.soundMax) {
                    this.noiseStatus = "Red";
                } else {
                    this.noiseStatus = "White";
                }

                if (this.data_db[5] >= this.pressureMin && this.data_db[5] < this.pressureMax) {
                    this.pressureStatus = "Yellow";
                } else if (this.data_db[5] >= this.pressureMax) {
                    this.pressureStatus = "Red";
                } else {
                    this.pressureStatus = "White";
                }

                if (this.data_db[6] >= this.humidityMin && this.data_db[6] < this.humidityMax) {
                    this.humidityStatus = "Yellow";
                } else if (this.data_db[6] >= this.humidityMax) {
                    this.humidityStatus = "Red";
                } else {
                    this.humidityStatus = "White";
                }

                // Populate categorical source object for graphs
                this.categoricalSource = [
                    { Sensor: "Vibration", Amount: this.data_db[2] },
                    { Sensor: "Temperature", Amount: this.data_db[3] },
                    { Sensor: "Noise Level", Amount: this.data_db[4] },
                    { Sensor: "Air Pressure", Amount: this.data_db[5] },
                    { Sensor: "Humidity", Amount: this.data_db[6] }
                ];
            }

        }, error => {
            console.log("Fetching error in Delete: ", error)
        });

        if (this.db_container != undefined) {
            this.lineGraphStore(this.db_container);

            if (this.db_container.length == 10) {
                this.db_container = [];
            }
        }
        this.measurementsUI = [];

        this.database.all("SELECT * FROM measurements_SSS ").then(rows => {

            this.measurements.push({
                "dateValues": rows[rows.length - 1][1],
                "timeValues": rows[rows.length - 1][2],
                "vibrationValues": rows[rows.length - 1][3],
                "temperatureValues": rows[rows.length - 1][4],
                "noiseValues": rows[rows.length - 1][5],
                "airValues": rows[rows.length - 1][6],
                "humidityValues": rows[rows.length - 1][7]
            });
        }, error => {
            console.log("Fetching error: ", error)
        });

    }

    public lineGraphStore(data_container) { // Function to facilitate the storage of data for the linegraph

        let data_length = data_container.length;
        this.data_points = [];
        var temp_data;

        for (let i = 0; i < data_container.length && i < this.lineGraphTimeNum; i++) {

            temp_data = { time: data_container[i][1], vibration: data_container[i][2], temperature: data_container[i][3], noise: data_container[i][4], pressure: data_container[i][5], humidity: data_container[i][6] };
            this.data_points.unshift(temp_data);
        }

        this.categoricalSource2 = this.data_points; // Set the catagorical source for the line graph to all the past data

    }

    public review() {
        // array order is vibr,temp,noise,air,humidity 
        //the section below deals with creating an array that takes the average of each column
        var averages = [0, 0, 0, 0, 0];
        this.database.all("SELECT AVG(vibrationValues),MAX(temperatureValues), MAX(noiseValues),MAX (airValues), MAX(humidityValues)  FROM measurements_SSS; ").then(avg_sql => {
            averages[0] = avg_sql[0][0];
            averages[1] = avg_sql[0][1];
            averages[2] = avg_sql[0][2];
            averages[3] = avg_sql[0][3];
            averages[4] = avg_sql[0][4];
        }, error => {
            console.log("Fetching error in Maxing: ", error)
        });

        // array order is vibr,temp,noise,air,humidity 
        //the section below deals with creating an array that takes the max/min of each column
        var max = [0, 0, 0, 0, 0];
        var min = [0, 0, 0, 0, 0];

        this.database.all("SELECT MAX(vibrationValues),MAX(temperatureValues), MAX(noiseValues),MAX (airValues), MAX(humidityValues)  FROM measurements_SSS; ").then(max_sql => {
            max[0] = max_sql[0][0];
            max[1] = max_sql[0][1];
            max[2] = max_sql[0][2];
            max[3] = max_sql[0][3];
            max[4] = max_sql[0][4];
        }, error => {
            console.log("Fetching error in Maxing: ", error)
        });

        this.database.all("SELECT MIN(vibrationValues),MIN(temperatureValues), MIN(noiseValues),MIN (airValues), MIN(humidityValues)  FROM measurements_SSS; ").then(min_sql => {
            min[0] = min_sql[0][0];
            min[1] = min_sql[0][1];
            min[2] = min_sql[0][2];
            min[3] = min_sql[0][3];
            min[4] = min_sql[0][4];
        }, error => {
            console.log("Fetching error in Mining: ", error)
        });
        var time_text = "";

        this.database.all("SELECT MIN(timing),MAX(timing) FROM measurements_SSS; ").then(time_sql => {
            var min = time_sql[0][0];
            var max = time_sql[0][1];

            var total_time = max - min;

            var diffHrs = Math.floor((total_time % 86400000) / 3600000); // hours
            var diffMins = Math.round(((total_time % 86400000) % 3600000) / 60000); // minutes
            var diffSec = Math.round((((total_time % 86400000) % 3600000) / 60000) / 60000); // minutes

            time_text = diffHrs + ":" + diffMins + ":" + diffSec + "." + (total_time % 1000);
        }, error => {
            console.log("Fetching error in Mining: ", error)
        });

        //this section creates a summary Doc
        var currentDate = new Date();
        var year = currentDate.getFullYear() + "-" + (currentDate.getMonth() + 1) + "-" + currentDate.getDate();
        var time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
        var file_text;

        const permissions = require("nativescript-permissions");
        permissions.requestPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE, "I need these permissions because I'm cool")
            .then(() => {
                let downloadedFilePath = fileSystem.path.join(android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS).getAbsolutePath(), year + "_" + time + "_summary.txt");
                let file = File.fromPath(downloadedFilePath);

                file_text = "TOTAL TIME OF TRIP: " + time_text;
                file_text = file_text + "\n\nVIBRATION DATA" + "\nAverage: " + averages[0] + "\nMax: " + max[0] + "\nMin: " + min[0] + "\n\n\n";
                file_text = file_text + "TEMPERATURE DATA" + "\nAverage: " + averages[1] + "\nMax: " + max[1] + "\nMin: " + min[1] + "\n\n\n";
                file_text = file_text + "NOISE DATA" + "\nAverage: " + averages[2] + "\nMax: " + max[2] + "\nMin: " + min[2] + "\n\n\n";
                file_text = file_text + "AIR PRESSURE DATA" + "\nAverage: " + averages[3] + "\nMax: " + max[3] + "\nMin: " + min[3] + "\n\n\n";
                file_text = file_text + "HUMIDITY DATA" + "\nAverage: " + averages[4] + "\nMax: " + max[4] + "\nMin: " + min[4] + "\n\n\n";


                file.writeText(file_text)
                    .then(result => {
                        // Succeeded writing to the file. 
                        file.readText().then(res => {

                        });
                    }).catch(err => {
                        console.log("Write to summary file error: ", err.stack);
                    });
            });

    }


    public backup() {
        this.measurements = [];
        var currentDate = new Date();
        var year = currentDate.getFullYear() + "-" + (currentDate.getMonth() + 1) + "-" + currentDate.getDate();
        var time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
        var file_text;
        var data_db = "";
        //
        const permissions = require("nativescript-permissions");
        permissions.requestPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE, "I need these permissions because I'm cool")
            .then(() => {
                let downloadedFilePath = fileSystem.path.join(android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS).getAbsolutePath(), year + "_" + time + ".txt");
                let file = File.fromPath(downloadedFilePath);


                this.database.all("SELECT * FROM measurements_SSS ").then(rows => {

                    for (let i = 0; i < rows.length; i++) {
                        //console.log("In for loop", i);
                        data_db = data_db + rows[i][1] + "," + rows[i][2] + "," + rows[i][3] + "," + rows[i][4] + "," + rows[i][5] + "," + rows[i][6] + "," + rows[i][7] + "\n";
                        //console.log("print of data", data_db);
                    }

                    file.writeText(data_db)
                        .then(result => {
                            // Succeeded writing to the file. 
                            file.readText().then(res => {
                                // Succeeded read from file. 
                                rows.isContentSaved = true;
                                rows.savedContent = res;
                                //console.log("File content: " + res);
                            });
                        }).catch(err => {
                            console.log("Write to file error: ", err.stack);
                        });



                }, error => {
                    console.log("Fetching error in Delete: ", error)
                });
            });

        //

    }

    public delete() {
        this.database.execSQL("DROP TABLE measurements_SSS ").then(id => {
        }, error => {
            console.log("empty table error: ", error);
        });
    }


    onItemTap(args: ItemEventData): void {
        console.log('Item with index: ' + args.index + ' tapped');
    }

    public constructor() {
        this.measurements = [];
        (new Sqlite("my.db")).then(db => {
            //db.execSQL("CREATE TABLE IF NOT EXISTS measurements_SSS (id INTEGER PRIMARY KEY AUTOINCREMENT, timeValues INTEGER, vibrationValues INTEGER, temperatureValues INTEGER, noiseValues INTEGER, airValues INTEGER, humidityValues INTEGER )").then(id => {
            db.execSQL("CREATE TABLE IF NOT EXISTS measurements_SSS (id INTEGER PRIMARY KEY AUTOINCREMENT, dateValues STRING, timeValues STRING, vibrationValues INTEGER, temperatureValues INTEGER, noiseValues INTEGER, airValues INTEGER, humidityValues INTEGER, timing INTEGER )").then(id => {

                this.database = db;

            }, error => {
                console.log("Create table error: ", error);
            });
            db.execSQL("DELETE FROM measurements_SSS ").then(id => {
            }, error => {
                console.log("empty table error: ", error);
            });
        }, error => {
            console.log("Error Opening database: ", error);
        });

    }

    public changeLineTime() { // Function to change the current time displayed label in line graph view

        if (this.lineGraphTime == "10 Seconds") {
            this.lineGraphTime = "30 Seconds";
            this.lineGraphTicks = "5";
            this.lineGraphTimeNum = 30;

        } else if (this.lineGraphTime == "30 Seconds") {
            this.lineGraphTime = "1 Minute";
            this.lineGraphTicks = "10";
            this.lineGraphTimeNum = 60;

        } else if (this.lineGraphTime == "1 Minute") {
            this.lineGraphTime = "30 Minutes";
            this.lineGraphTicks = "20";
            this.lineGraphTimeNum = 1800;

        } else if (this.lineGraphTime == "30 Minutes") {
            this.lineGraphTime = "1 Hour";
            this.lineGraphTicks = "50";
            this.lineGraphTimeNum = 3600;

        } else if (this.lineGraphTime == "1 Hour") {
            this.lineGraphTime = "All Time";
            this.lineGraphTicks = "100";
            this.lineGraphTimeNum = Infinity;

        } else {
            this.lineGraphTime = "10 Seconds";
            this.lineGraphTicks = "1";
            this.lineGraphTimeNum = 10;
        }
        this.fetchUIData();
    }

    public pauseUI() { // Function to pause all UI elements and display "Paused Screen" label

        if (this.stateUI == "Play Screen") {
            this.stateUI = "Pause Screen";
            this.lineGraphHeight = "90%";
            this.statusUI = null;
            alert("Display is now live.\n")
        } else {

            if (this.x0 != undefined) {

                this.stateUI = "Play Screen"
                this.fetchUIData();
                this.lineGraphHeight = "80%";
                alert("Display has been paused.\nData is still being collected.\n");
                this.statusUI = "Screen is Currently Paused"
            } else {

                alert("Cannot Pause Screen Since the Processes Have Not Been Started.")
            }
        }
    }

    public menuToggle() { // Open or close menu
        this.menu = !this.menu;
    }

    public toggleLineGraphs(graphVisible) { // Line graph visibility function

        // Logic to toggle which line graph is visible and set the sizing for that element based on how many are enabled

        if (graphVisible == "vibration") { 
            if (!this.vibrationVisible && !this.temperatureVisible && !this.noiseVisible) {
                this.vibrationHeight = "100%"; this.vibrationVisible = true;
                this.temperatureVisible = false;
                this.noiseVisible = false;

            } else if (!this.vibrationVisible && this.temperatureVisible && this.noiseVisible) {
                this.vibrationHeight = "33%"; this.vibrationVisible = true;
                this.temperatureHeight = "33%"; this.temperatureVisible = true;
                this.noiseHeight = "33%"; this.noiseVisible = true;

            } else if (!this.vibrationVisible && !this.temperatureVisible && this.noiseVisible) {
                this.vibrationHeight = "50%"; this.vibrationVisible = true;
                this.noiseHeight = "50%"; this.noiseVisible = true;
                this.temperatureVisible = false;

            } else if (!this.vibrationVisible && this.temperatureVisible && !this.noiseVisible) {
                this.vibrationHeight = "50%"; this.vibrationVisible = true;
                this.temperatureHeight = "50%"; this.temperatureVisible = true;
                this.noiseVisible = false;

            } else if (this.vibrationVisible && this.temperatureVisible && this.noiseVisible) {
                this.vibrationVisible = false;
                this.temperatureHeight = "50%"; this.temperatureVisible = true;
                this.noiseHeight = "50%"; this.noiseVisible = true;

            } else if (this.vibrationVisible && !this.temperatureVisible && this.noiseVisible) {
                this.vibrationVisible = false;
                this.noiseHeight = "100%"; this.noiseVisible = true;
                this.temperatureVisible = false;

            } else if (this.vibrationVisible && this.temperatureVisible && !this.noiseVisible) {
                this.vibrationVisible = false;
                this.temperatureHeight = "100%"; this.temperatureVisible = true;
                this.noiseVisible = false;

            } else if (this.vibrationVisible && !this.temperatureVisible && !this.noiseVisible) {
                this.vibrationVisible = false;
                this.temperatureVisible = false;
                this.noiseVisible = false;
            }
        } else if (graphVisible == "temperature") {
            if (!this.vibrationVisible && !this.temperatureVisible && !this.noiseVisible) {
                this.vibrationVisible = false;
                this.temperatureHeight = "100%"; this.temperatureVisible = true;
                this.noiseVisible = false;

            } else if (!this.vibrationVisible && this.temperatureVisible && this.noiseVisible) {
                this.vibrationVisible = false;
                this.temperatureVisible = false;
                this.noiseHeight = "100%"; this.noiseVisible = true;

            } else if (!this.vibrationVisible && !this.temperatureVisible && this.noiseVisible) {
                this.vibrationVisible = false;
                this.noiseHeight = "50%"; this.noiseVisible = true;
                this.temperatureHeight = "50%"; this.temperatureVisible = true;

            } else if (!this.vibrationVisible && this.temperatureVisible && !this.noiseVisible) {
                this.vibrationVisible = false;
                this.temperatureVisible = false;
                this.noiseVisible = false;

            } else if (this.vibrationVisible && this.temperatureVisible && this.noiseVisible) {
                this.vibrationHeight = "50%"; this.vibrationVisible = true;
                this.temperatureVisible = false;
                this.noiseHeight = "50%"; this.noiseVisible = true;

            } else if (this.vibrationVisible && !this.temperatureVisible && this.noiseVisible) {
                this.vibrationHeight = "33%"; this.vibrationVisible = true;
                this.noiseHeight = "33%"; this.noiseVisible = true;
                this.temperatureHeight = "33%"; this.temperatureVisible = true;

            } else if (this.vibrationVisible && this.temperatureVisible && !this.noiseVisible) {
                this.vibrationHeight = "100%"; this.vibrationVisible = true;
                this.temperatureVisible = false;
                this.noiseVisible = false;

            } else if (this.vibrationVisible && !this.temperatureVisible && !this.noiseVisible) {
                this.vibrationHeight = "50%"; this.vibrationVisible = true;
                this.temperatureHeight = "50%"; this.temperatureVisible = true;
                this.noiseVisible = false;
            }
        } else if (graphVisible == "noise") {
            if (!this.vibrationVisible && !this.temperatureVisible && !this.noiseVisible) {
                this.vibrationVisible = false;
                this.noiseHeight = "100%"; this.noiseVisible = true;
                this.temperatureVisible = false;

            } else if (!this.vibrationVisible && this.temperatureVisible && this.noiseVisible) {
                this.vibrationVisible = false;
                this.noiseVisible = false;
                this.temperatureHeight = "100%"; this.temperatureVisible = true;

            } else if (!this.vibrationVisible && !this.temperatureVisible && this.noiseVisible) {
                this.vibrationVisible = false;
                this.noiseVisible = false;
                this.temperatureVisible = false;

            } else if (!this.vibrationVisible && this.temperatureVisible && !this.noiseVisible) {
                this.vibrationVisible = false;
                this.temperatureVisible = false;
                this.noiseHeight = "100%"; this.noiseVisible = true;

            } else if (this.vibrationVisible && this.temperatureVisible && this.noiseVisible) {
                this.vibrationHeight = "50%"; this.vibrationVisible = true;
                this.noiseVisible = false;
                this.temperatureHeight = "50%"; this.temperatureVisible = true;

            } else if (this.vibrationVisible && !this.temperatureVisible && this.noiseVisible) {
                this.vibrationHeight = "100%"; this.vibrationVisible = true;
                this.noiseVisible = false;
                this.temperatureVisible = false;

            } else if (this.vibrationVisible && this.temperatureVisible && !this.noiseVisible) {
                this.vibrationHeight = "33%"; this.vibrationVisible = true;
                this.temperatureHeight = "33%"; this.temperatureVisible = true;
                this.noiseHeight = "33%"; this.noiseVisible = true;

            } else if (this.vibrationVisible && !this.temperatureVisible && !this.noiseVisible) {
                this.vibrationHeight = "50%"; this.vibrationVisible = true;
                this.temperatureVisible = false;
                this.noiseHeight = "50%"; this.noiseVisible = true;
            }
        }

    }


    public async dataCollect() { // Function to asynchronously run and request data from the microcontroller

        httpModule.request({
            url: "http://192.168.1.49/app", // Address that the microcontroller is set to
            method: "GET" // Type of request
        }).then((response) => {
            this.rawJSONStream = JSON.stringify(response); // JSON stream stored to global variable from "response"

        }, (e) => {
            console.log(e); // Log any errors to console
        });

    }


    ngOnInit() { // All required variables that need to be initialized when the app opens

        this.vibrationStatus = "White";
        this.temperatureStatus = "White";
        this.noiseStatus = "White";
        this.pressureStatus = "White";
        this.humidityStatus = "White";
        this.stateUI = "Pause Screen";
        this.data_db = [0, 0, 0, 0, 0, 0, 0];
        this.currentView = "View: No Data";
        this.lineGraphTime = "10 Seconds";
        this.lineGraphTimeNum = 10;
        this.lineGraphTicks = "1";
        this.lineGraphHeight = "90%";
        this.menu = false;
        this.vibrationHeight = "33%"; this.vibrationVisible = true;
        this.temperatureHeight = "33%"; this.temperatureVisible = true;
        this.noiseHeight = "33%"; this.noiseVisible = true;

        this.pause = true;
        this.vibrationLine = true;
        this.temperatureLine = true;
        this.noiseLine = true;

        this.vibrationMin = 8;
        this.vibrationMax = 12;
        this.temperatureMin = 20;
        this.temperatureMax = 30;
        this.soundMin = 17;
        this.soundMax = 20;
        this.pressureMin = 17;
        this.pressureMax = 20;
        this.humidityMin = 17;
        this.humidityMax = 20;


    }

    menuItemToggle = function (value) { // Function to set toggle switched in menu

        if (value == "pause") {
            this.pause = !this.pause;

        }
        if (value == "vibration") {
            this.vibrationLine = !this.vibrationLine;

        }
        if (value == "temperature") {
            this.temperatureLine = !this.temperatureLine;

        }
        if (value == "noise") {
            this.noiseLine = !this.noiseLine;

        }

    }

    opensnack() { // Thread to insert into database
        this.insert();
    }
    opensnackUI() { // Thread to fetch data for UI elements
        if (this.stateUI == "Pause Screen") {
            this.fetchUIData();
        }
    }
    opensnackESP() { // Thread to obtain JSON data from ESP microcontroller
        this.dataCollect();
    }

    ngOnDestroy() {

        this.subscription && this.subscription.unsubscribe();
        clearInterval(this.intervalId);

        this.subscriptionUI && this.subscriptionUI.unsubscribe();
        clearInterval(this.intervalIdUI);

        this.subscriptionESP && this.subscriptionESP.unsubscribe();
        clearInterval(this.intervalIdESP);
    }
}

