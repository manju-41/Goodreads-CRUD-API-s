const express = require('express');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { request } = require('http');
const { response } = require('express');


const app = express();
app.use(express.json())

const dbPath = path.join(__dirname,"goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
    try{
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(3000,()=>{
            console.log("Server Running at http://localhost:3000/")
        })
    }
    catch(e){
        console.log(`DB Error: ${e.message}`)
        process.exit(1);
    }

};


initializeDBAndServer();

const authenticateToken = (request,response,next) => {
    const authHeader = request.headers["authorization"];
    let jwtToken;
    if (authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined){
        response.status(401);
        response.send("Invalid JWT Token");
    }
    else{
        jwt.verify(jwtToken,"gnjrgbghbhr",async (error,payload)=>{
            if(error){
                response.status(401);
                response.send("Invalid JWT Token")
            }
            else{
                request.username = payload.username;
                next();
            }
        })
    }
}

//Get Books API
app.get("/books/", async (request,response)=>{
    const getBooksQuery = `
    SELECT *
    FROM book
    ORDER BY book_id;`;
    let booksArray = await db.all(getBooksQuery);
    response.send(booksArray);
});

//Get Book API
app.get("/books/:bookId/", async (request,response)=>{
    const {bookId} = request.params
    const getBookQuery = `
    SELECT 
    *
    FROM
    book
    WHERE book_id=${bookId};`;
    const book = await db.get(getBookQuery);
    response.send(book);
});

//Add Book API
app.post("/books/", async (request,response)=>{
    
    const bookDetails = request.body;
    const {
        title,
        authorId,
        rating,
        ratingCount,
        reviewCount,
        description,
        pages,
        dateOfPublication,
        editionLanguage,
        price,
        onlineStores,
    } = bookDetails;

    const addBookQuery = `
    INSERT INTO
      book (title,author_id,rating,rating_count,review_count,description,pages,date_of_publication,edition_language,price,online_stores)
    VALUES
      (
        '${title}',
         ${authorId},
         ${rating},
         ${ratingCount},
         ${reviewCount},
        '${description}',
         ${pages},
        '${dateOfPublication}',
        '${editionLanguage}',
         ${price},
        '${onlineStores}'
      );`;
      const dbResponse = await db.run(addBookQuery);
      console.log(dbResponse.lastID);
});

//Update Book API
app.put("/books/:bookId", async (request,response)=>{
    const {bookId} = request.params;
    const bookDetails = request.body;
    const {
        title,
        authorId,
        rating,
        ratingCount,
        reviewCount,
        description,
        pages,
        dateOfPublication,
        editionLanguage,
        price,
        onlineStores,
      } = bookDetails;

    const updateBookQuery = `
    UPDATE
      book
    SET
      title='${title}',
      author_id=${authorId},
      rating=${rating},
      rating_count=${ratingCount},
      review_count=${reviewCount},
      description='${description}',
      pages=${pages},
      date_of_publication='${dateOfPublication}',
      edition_language='${editionLanguage}',
      price= ${price},
      online_stores='${onlineStores}'
    WHERE
      book_id = ${bookId};`; 

    await db.run(updateBookQuery);

    response.send("Book updated successfully")
});

//Delete Book API
app.delete("/books/:bookId", async (request,response)=>{
    const {bookId} = request.params;
    const deleteBookQuery = `
    DELETE FROM book
    WHERE book_id=${bookId};`;
    await(db.run(deleteBookQuery));
    response.send("Book Deleted Successfully");
});

//Get Author Books API
app.get("/authors/:authorId/books" , async (request,response)=>{
    const {authorId} = request.params
    const getAuthorBooksQuery = `
    SELECT 
        *
    FROM
        book
    WHERE
        author_id = ${authorId};`;
    const booksArray = await db.all(getAuthorBooksQuery);
    response.send(booksArray);
});

//Filtering Books API
app.get("/filterbooks/", async (request,response)=>{
    const {offset=0,limit=10,search_q="",order="ASC",order_by="book_id"} = request.query
    const getfilteredBooksQuery = `
    SELECT *
    FROM book
    WHERE title LIKE '%${search_q}%'
    ORDER BY ${order_by} ${order}
    LIMIT ${limit}
    OFFSET ${offset}`;
    let filteredbooksArray = await db.all(getfilteredBooksQuery);
    response.send(filteredbooksArray);
});

//Register User API
app.post("/users/",async (request,response)=>{
    const{username,name,password,gender,location}=request.body;
    const hashedPassword = await bcrypt.hash(password,10);
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined){
        const createUserQuery = `
        INSERT INTO user(username,name,password,gender,location)
        VALUES
        (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
        );`;
        await db.run(createUserQuery);
        response.send("User created successfully");
    }
    else{
        response.send(400);
        response.send("User already exists...")

    }
});

//Login User API
app.post("/login/",async (request,response)=>{
    const {username,password} = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined){
        response.status(400);
        response.send("Invalid User...");
    }
    else{
        const isPasswordMatched = await bcrypt.compare(password,dbUser.password);
        if(isPasswordMatched===true){
            const payload = {username: username};
            const jwtToken = jwt.sign(payload,"gnjrgbghbhr")
            response.send(jwtToken);
        }
        else{
            response.status(400);
            response.send("Invalid Password...")
        }
    }
});

//Get Books API with authentication and authorization
app.get("/abooks/", authenticateToken,async (request,response)=>{
    const getBooksQuery = `
    SELECT *
    FROM book
    ORDER BY book_id;`;
    let booksArray = await db.all(getBooksQuery);
    response.send(booksArray);

});

//Get Book API with authenticcation and authorization
app.get("/abooks/:bookId/", authenticateToken,async (request,response)=>{
    const {bookId} = request.params
    const getBookQuery = `
    SELECT 
    *
    FROM
    book
    WHERE book_id=${bookId};`;
    const book = await db.get(getBookQuery);
    response.send(book);
});

//Get User Profile API
app.get("/profile/",authenticateToken,async (request,response)=>{
    let {username} = request;
    const selectUserQuery = `SELECT * FROM user WHERE username='${username}';`;
    const userDetails = await db.get(selectUserQuery);
    response.send(userDetails);
});