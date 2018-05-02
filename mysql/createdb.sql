drop database if exists 'lahacks';
create database 'lahacks';
use 'lahacks';

create table users (
	username varchar(20) not null,
	/* password size tbh for hashing */
	password varchar(20) not null,
	firstName varchar(30),
	lastName varchar(30),
	primary key (username)
);

create table categories (
	name varchar(30) not null,
	creator varchar(20) not null,
	primary key (name),
	foreign key (creator) references users(username)
);

create table post (
	title varchar(150) not null,
	description varchar(1000),
	username varchar(20) not null,
	category varchar(30) not null,
	photoID varchar(20) not null,
	imgAddress varchar(200) not null,
	at datetime not null default CURRENT_TIMESTAMP,
	primary key (photoID),
	foreign key (username) references users(username),
	foreign key (category) references category(name)
);

create table likes (
	username varchar(20) not null,
	photoID varchar(20) not null,
	likeState bit not null,
	at datetime not null default CURRENT_TIMESTAMP,
	primary key (username, photoID),
	foreign key (username) references users(username),
	foreign key (photoID) references uploads(photoID)
);

create table comments (
	username varchar(20) not null,
	photoID varchar(20) not null,
	content varchar(10000) not null,
	at datetime not null default CURRENT_TIMESTAMP,
	foreign key (username) references users(username),
	foreign key (photoID) references uploads(photoID)
);

/* use this table to prevent brute-forcing */
/* NOTE: using setTimeout to poll / update table occasionally */
create table attempts (
	IP varchar(15) not null,
	attempts int not null default 0
);
