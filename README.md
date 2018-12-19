# LA Hacks (Improved)
An Imgur/Reddit style application built like a mobile application.

<p float="left" align="center">
	<img src="./screenshots/desktop demo.gif" height="300"/>
	<img src="./screenshots/mobile demo.gif" height="300" />
</p>

[Desktop Demo Video](https://youtu.be/_a-jHiP1omo)

[Mobile Demo Video](https://youtu.be/UAslSN53XpY)

## Table of Contents
* [Features](#features)
* [Stack](#stack)
* [Installation](#installation)
* [Fixing MySQL Errors](#fixing-mysql-errors)
* [Using The Test Folder Prototype](#using-the-test-folder-prototype)


## Features
* cross-browser compatibility °˖✧◝(⁰▿⁰)◜✧˖°
* responsive design, great for your phone (ღゝ◡╹)ノ♡)
* lazy-loading posts
* upload photos
* like photos
* compression of photos (server-side)
* account system + session tracking
* view all your uploaded photos
* view category of photos by other users
* create your own categories
* comment on posts
* reply to commments
* signup/login input validation (server and client)
* reCaptcha validation (server and client)
* History API to manipulate page state and page navigation
* SQL injection prevention


## Stack
* Front End
	* jQuery
	* [FilePond](https://pqina.nl/filepond/) (file uploading interface)
	* reCaptcha 2.0
	* EJS templates
* Back End
	* Node.js and custom API
	* reCaptcha 2.0
	* MySQL Database
	* [mysqljs](https://github.com/mysqljs/mysql) (mysql driver)
	* [expressjs session](https://github.com/expressjs/session) (managing user session and authentication)
	* [bcrypt](https://github.com/kelektiv/node.bcrypt.js) (password encryption)
	* [sharp](https://github.com/lovell/sharp) (image compression)


## Installation

**Note: You'll need Node v10+ before starting. The image compression library dependency requires this.**

You'll want to git clone and then change into the project directory. In any directory inside the project, call this command on the command line:

```
npm install
```

Now you'll need to start up MySQL.

```
mysqld
```


Inside `mysqlCredentials.json` be sure to fill out the template:
```
{
	"host": "yourHost", // default is localhost
	"user": "yourUser",
	"password": "yourPassword"
}
```


Now you can start the application!
```
npm start
```
**Note: The 'npm start' command also resets the database 'lahacks' used in this project. If you'd like to change this, please fix it in `package.json`**

This will start the server on [port 8080](http://127.0.0.1:8080) assuming your host is localhost.

## Fixing MySQL Errors

Newer installations of MySQL come with a `ONLY_FULL_GROUP_BY` setting for sql_mode that the restrict certain queries (that the author did not consider at the time of writing the application). To see if you have this setting, run the following in the MySQL console:

```sql
SELECT @@sql_mode;
```

If you have the setting, we'll need to remove it while we run this application. Run the following commands in the MySQL console:

```sql
SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));

SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));
```

If you would like to restore the setting after using the application, run the following commands in the MySQL console:

```sql
SET GLOBAL sql_mode=(SELECT CONCAT(@@sql_mode,'ONLY_FULL_GROUP_BY'));

SET SESSION sql_mode=(SELECT CONCAT(@@sql_mode,'ONLY_FULL_GROUP_BY'));
```


## Using the Test Folder Prototype

You may choose to use Python's simple HTTP server or you may use npm's live-server. As long as the server is able to set the root directory to be the 'prototype' directory, it should be fine.

### Python
If you have python (v3.6+) you may make the following call inside the prototype directory:
```
python -m http.server
```
Then, just go to the port inside your web browser.

### Live-Server
Otherwise, you'll need to install [npm live-server](https://www.npmjs.com/package/live-server) globally first. I didn't include this in my modules since I have this globally installed for specific testing and everyone's tools are different.

Go into the prototype folder directory and then call:
```
live-server
```
