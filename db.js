const con = require('mysql2').createConnection({
    host: 'localhost',
    port: 3306,
    user: 'justrcon',
    password: 'ORssoOiz5RwmrgZt',
    database: 'justrcon',
    connectTimeout: 604800000
});

con.connect((err) => {
    if(err) return console.error(err);
    else return console.info('OK | Подключился к базе данных');
});

const dbPromise = {
    query: (q) => new Promise((Resolve, Reject) =>
        con.query(q, (error, Response) => {
            if(error) return Reject(error);
            else return Resolve(Response);
        })
    )
};

module.exports = {
    mysql: dbPromise
};
