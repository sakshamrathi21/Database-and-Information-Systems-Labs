# CS 349 - Lab 5 - REST API + ReactJS

Instructions to run this app:
1. Open the file backend/app.js and set your postgres username, password and database that you want to use with this app. You can also modify the session secret key that will be used for authentication in the session information section.
2. Run `$ \i DDL.sql` (that is present in the /backend directory) using postgres to load the schema, then run `$ \i data.sql` to load the data in the postgres database.
3. Open the backend/ directory and run `$ npm install` to install the dependencies required for this backend.
4. Run `$ node app.js` in the backend/ directory to run the backend server at http://localhost:4000.
5. Open the frontend/ directory and run `$ npm install` to install the dependencies required for the fronted.
6. Run `$ npm start` in the frontend/ directory to run the frontend ReactJS app on http://localhost:3000.
