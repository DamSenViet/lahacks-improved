drop database if exists lahacks;
create database lahacks;
use lahacks;

create table users (
	username varchar(20) not null,
	-- max password size tbh for hashing
	password varchar(20) not null,
	primary key (username)
);

create table categories (
	name varchar(30) not null,
	creator varchar(20) not null,
	primary key (name),
	foreign key (creator) references users(username)
);

create table posts (
	postID varchar(20) not null,
	title varchar(150) not null,
	description varchar(140),
	username varchar(20) not null,
	category varchar(30) not null,
	imgAddress varchar(200) not null,
	at datetime not null default CURRENT_TIMESTAMP,

	primary key (postID),
	foreign key (username) references users(username),
	foreign key (category) references categories(name)
);

create table postLikes (
	username varchar(20) not null,
	postID varchar(20) not null,
	likeState bit not null,
	at datetime not null default CURRENT_TIMESTAMP,
	primary key (username, postID),
	foreign key (username) references users(username),
	foreign key (postID) references posts(postID)
);

-- comments also going to handle replies with depth and parentID
-- now going with max depth of 2 to avoid overdesigning
create table comments (
	commentID varchar(10) not null,

-- need trigger to prevent insert if commentID = parentID
	parentID varchar(10) default null,

-- need to create trigger, on add, check if item has parent, if it does +=1 to depth

	username varchar(20) not null,
	postID varchar(20) not null,
	content varchar(10000) not null,
	at datetime not null default CURRENT_TIMESTAMP,
	primary key (commentID),
	foreign key (parentID) references comments(commentID),
	foreign key (username) references users(username),
	foreign key (postID) references posts(postID)
);

-- use this table to prevent brute-forcing
-- NOTE: using setTimeout to poll / update table occasionally
create table attempts (
	IP varchar(15) not null,
	attempts int not null default 0
);

-- TEST INSERTS
-- insert into users values (true, 'username', 'password', 'firstName', 'lastName');
