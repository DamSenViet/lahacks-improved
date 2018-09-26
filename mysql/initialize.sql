drop database if exists lahacks;
create database lahacks;
use lahacks;

create table users (
	username varchar(20) not null,
	-- bcrypt unique salt for each user
	password varchar(60) not null,
	primary key (username)
);

create table categories (
	name varchar(30) not null,
	at datetime not null,
	primary key (name)
);

create table posts (
	postID int auto_increment,
	title varchar(100) not null,
	description varchar(140),
	username varchar(20) not null,
	category varchar(30) not null,
	at datetime not null,

	primary key (postID),
	foreign key (username) references users(username),
	foreign key (category) references categories(name),

	-- this is an index, need to make one for every SET of columns you need the index on
	FULLTEXT (title, description)
);

create table postLikes (
	username varchar(20) not null,
	postID int not null,
	-- if like exists, this entry exists; if it doesn't then it doesn't
	-- was planning on using likeState for dislike function
	at datetime not null default CURRENT_TIMESTAMP,
	primary key (username, postID),
	foreign key (username) references users(username),
	foreign key (postID) references posts(postID)
);

-- comments also going to handle replies with depth and parentID
-- now going with max depth of 2 to avoid overdesigning
create table comments (
	commentID int auto_increment,

-- need trigger to prevent insert if commentID = parentID
	parentID int default null,

	username varchar(20) not null,
	postID int,
	content varchar(1000) not null,
	at datetime not null,
	primary key (commentID),
	foreign key (parentID) references comments(commentID),
	foreign key (username) references users(username),
	foreign key (postID) references posts(postID)
);
