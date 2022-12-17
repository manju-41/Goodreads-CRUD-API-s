const express = require('express');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
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

//Get Books API
app.get("/books/",async (request,response)=>{
    const getBooksQuery = `
    SELECT *
    FROM book
    ORDER BY book_id;`;
    let booksArray = await db.all(getBooksQuery);
    response.send(booksArray);
});

//Get Book API
app.get("/books/:bookId/",async (request,response)=>{
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
app.post("/books/",async (request,response)=>{
    
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
})