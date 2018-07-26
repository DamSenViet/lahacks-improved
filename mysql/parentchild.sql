-- testing if comments can have parent child relationship in same table
drop database if exists test;
create database test;
use test;

create table comments (
	commentID varchar(10) not null,
	parentID varchar(10) default null,
	content varchar(100),
	primary key (commentID),
	foreign key (parentID) references comments(commentID)
);
