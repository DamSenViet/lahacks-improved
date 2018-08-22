-- testing if comments can have parent child relationship in same table
-- nested comments test

drop database if exists test;
create database test;
use test;

create table comments (
	commentID varchar(10) not null,
	parentID varchar(10) default null,
	content varchar(100),
	primary key (commentID), -- need this otherwise it won't work
	foreign key (parentID) references comments(commentID)
);
