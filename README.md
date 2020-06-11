# CHEO Neonatal Stats Tracker

### Code stored in subdirectory "/app/home" ###

Below is a snippet from the final report.

## Problem Statement
This project aims to measure and quantify environmental factors experienced by neonatal patients while in emergency transport. The chosen observable factors include vibration, sound, temperature, humidity, and pressure. The system put in place prior to our engagement was with extremely limited functionality and caused false data and poor use of professional’s time. Our project aims to leverage the previous work done and add functionality allowing a user to view the data real time, verify sensor outputs, and export trip data for further analysis.

## Requirements
The overarching requirements for this project are to quantify changes in the environment during transportation of neonatal patients. To accomplish this quantification of transportation data, our team set out to create a real-time patient monitoring system using a prefabricated sensor cluster and accompanying mobile application. This system would be utilized by respiratory specialists and nurses on CHEO’s neonatal transport units thus reliability of the finished product is imperative as availability in the healthcare field is a top priority. As the project is separated into three modules, which consist of hardware, the database, and the mobile application, each module contains their own set of requirements on which the leading member based their design decisions on. 

## Hardware Requirements
As system availability is paramount in any health-related electronics, the sensor firmware was developed in a way which promotes data redundancy in an effort to protect any data from unforeseen losses. This was accomplished through two design decisions. The first of which being, backing up all data directly on the sensor cluster as it is being collected. This is the original unedited data and acts as a failsafe in the event of a full system malfunction. The second design decision regarding data redundancy will be discussed in section 3.1.2 pertaining to the database design. 

## Database Requirements
The second source of redundancy is within the database and is made possible since we have chosen SQLite. The benefits to using a self-hosted database like SQLite is the fact that it is hosted locally on the mobile device in which it runs. Due to locality the database ties directly into the software of the application which gives it user access to the filesystem of the device. This filesystem access is beneficial since any and all data that populates the database on runtime will be stored on the device indefinitely in the event of any failure between devices and is only removed when an explicit “delete” command is issued. The system is required to be up and running on every possible CHEO transport scenario. These include trips to the edges of the coverage site. Out of all children's hospitals, CHEO has the widest reach area wise. This means they perform transports in areas with little to no cellular network. For this reason, the database needs to be self- hosted on the tablet, and not on a server off-site. The database also requires to be backed up for later data analysis when the trip ends. 

## Mobile Application Requirements
The mobile application requirement pertained solely to usability; this was essential in the design of the application since the users involve persons in high stress fast paced environments. Creating an application that did not include a simple interface and clear views of the displayed data would result in a worthless product. The reason this requirement dictates the entire application development is because this is the component which interfaces the user to the entirety of the system. Enabling the user to simply and conveniently observe and interact with real time data results in users who are more likely to be fond of the overall system and therefore not hinder any of the other important work that takes place in the situations which this would be deployed in. 

## Accomplishments
Throughout the course of this year our group has created the real time data tracking system described in our problem statement. This system has the full-fledged ability to collect sensor data, transmit to an accompanying tablet, display the information in multiple graph and chart views, and then export all the data in a formatted text file once a trip has been completed.
