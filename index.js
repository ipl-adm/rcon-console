const config = {
    supportURI: 'https://vk.me/durov', // Ссылка на группу ВК
    site: {
        name: "Pavel Durov's server" // Имя сайта
    },
    port: 3000
};

const Rcon = require('modern-rcon');
const server = new Rcon("149.202.86.137", port = 25041, "F1BVPVFOT7I80HZIF7GN");
const con = require('./db').mysql;
const express = require('express');
const app = express();

function hash(query) {
    var md5 = require('js-md5');
    var hashed = md5(query);

    console.log(hashed);
    return hashed;
}

app.use(require('cors')());
app.use('/static', express.static(__dirname + '/static'));
app.set('view engine', 'ejs');
app.use(
    require('cookie-parser')()
);

app.get('/api/rcon', (req, res) => {
    const command = req.query.cmd;
    const token = req.query.token;

    if(!token) return res.json({
        status: "error",
        error: "Empty token"
    });

    if(!command) return res.json({
        status: "error",
        error: "Empty command"
    });

    con.query(`SELECT * FROM panelUsers WHERE userToken = '${token}'`)
        .then((data) => {
            if(!data[0]) return res.json({
                status: "error",
                error: "Access denied"
            }); else {
                const badCommands = [
                    'essentials', 'essentials:',
                    'minecraft', 'minecraft:',
                    'eval', 'worldedit:eval',
                    'sudo', 'essentials:sudo',
                    'pex', 'permissionsex:pex',
                    'op', 'minecraft:op',
                    'deop', 'minecraft:deop',
                    'stop', 'minecraft:stop',
                    'restart', 'minecraft:restart',
                    'reload', 'minecraft:reload',
                    'save-off',
                    'save-on',
                    'save-all',
                    'save', 'save-'
                ];
                if(badCommands.includes(command) || badCommands.startsWith(command)) return res.json({
                    status: "error",
                    error: "Command not accepted"
                }); else return server.connect()
                    .then(() => server.send(command))
                    .then((data) => res.json({ status: 'success', command: command, response: data.replace(/§./g, '') || "Сервер вернул пустой ответ." }) )
                    .then(() => server.disconnect());
            }
        }).catch(console.error);
});

app.get('/', (req, res) => {
    if(!req.cookies.userSession) return res.redirect('/login');
    con.query(`SELECT * FROM panelUsers WHERE userToken = '${req.cookies.userSession}'`)
        .then((data) => {
            if(!data[0]) {
                res.cookie('userSession', null, { maxAge: -1 });
                return res.redirect('/login?error=0');
            } else return res.render(`${__dirname}/pages/index.ejs`, { panelName: config.site.name, supportURI: config.supportURI, userData: data[0] });
        }).catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
});

app.get('/console', (req, res) => {
    if(!req.cookies.userSession) return res.redirect('/login');
    con.query(`SELECT * FROM panelUsers WHERE userToken = '${req.cookies.userSession}'`)
        .then((data) => {
            if(!data[0]) {
                res.cookie('userSession', null, { maxAge: -1 });
                return res.redirect('/login?error=0');
            } else return res.render(`${__dirname}/pages/console.ejs`, { panelName: config.site.name, supportURI: config.supportURI, userData: data[0] });
        }).catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
});

app.get('/error', (req, res) => {
    let err = null;
    switch (Number(req.query.error)) {
        case -1:
            err = 'У Вас недостаточно прав для выполнения данного действия.';
            break;

        case 0:
            err = 'Страница не найдена.';
            break;

        case 1:
            err = `Внутренняя ошибка сервера. Обратитесь в нашу группу ВК: ${config.supportURI}`;
            break;

        default:
            err = `Неизвестная ошибка. Обратитесь в нашу группу ВК: ${config.supportURI}`;
            break;
    }

    return res.render(`${__dirname}/pages/error.ejs`, { panelName: config.site.name, supportURI: config.supportURI, error: { code: req.query.error || -2, message: err } });
});

app.get('/login', (req, res) => {
    if(req.cookies.userSession) return res.redirect('/');
    if(req.query.error) {
        let err = null;
        switch (Number(req.query.error)) {
            case 0:
                err = 'Вы ввели неверную пару "логин/пароль".';
                break;

            case 1:
                err = 'Сессия устарела. Пожалуйста, переавторизуйтесь!';
                break;

            case 2:
                err = 'Вы не указали пару "логин/пароль".';
                break;

            case 3:
                err = 'Вы неавторизованы для выхода из аккаунта.';
                break;

            case 4:
                err = 'Вы вышли из аккаунта.';
                break;

            default:
                err = `Неизвестная ошибка. Обратитесь в нашу группу ВК: ${config.supportURI}`;
                break;
        }

        return res.render(`${__dirname}/pages/login.ejs`, { panelName: config.site.name, supportURI: config.supportURI, errorCode: err });
    } else return res.render(`${__dirname}/pages/login.ejs`, { panelName: config.site.name, supportURI: config.supportURI, errorCode: "Пожалуйста, авторизуйтесь!" });
});

app.get('/register', (req, res) => {
    con.query(`SELECT * FROM panelUsers WHERE userToken = '${req.cookies.userSession}'`)
        .then((data) => {
            if(!data[0]) {
                res.cookie('userSession', null, { maxAge: -1 });
                return res.redirect('/login?error=0');
            } else {
                if(data[0].userAccess < 2) return res.redirect('/error?error=-1');
                if(req.query.error) {
                    let err = null;
                    switch (Number(req.query.error)) {
                        case 1:
                            err = 'Пользователь с таким логином уже есть в базе данных.';
                            break;

                        case 2:
                            err = 'Аккаунт зарегистрирован!';
                            break;

                        case 3:
                            err = 'Данные не указаны.';
                            break;

                        case 4:
                            err = 'С данным уровнем доступа регистрация разрешена только администратору.';
                            break;

                        default:
                            err = `Неизвестная ошибка. Обратитесь в нашу группу ВК: ${config.supportURI}`;
                            break;
                    }

                    return res.render(`${__dirname}/pages/register.ejs`, { panelName: config.site.name, supportURI: config.supportURI, errorCode: err, userToken: req.cookies.userSession });
                } else return res.render(`${__dirname}/pages/register.ejs`, { panelName: config.site.name, supportURI: config.supportURI, errorCode: "Введите данные для регистрации пользователя.", userToken: req.cookies.userSession });
            }
        }).catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
});

app.get('/users', (req, res) => {
    con.query(`SELECT * FROM panelUsers WHERE userToken = '${req.cookies.userSession}'`)
        .then((data) => {
            if(!data[0]) {
                res.cookie('userSession', null, { maxAge: -1 });
                return res.redirect('/login?error=0');
            } else {
                if(data[0].userAccess < 2) return res.redirect('/error?error=-1');
                else {
                    if(req.query.error) {
                        let err = null;
                        switch (Number(req.query.error)) {
                            case 1:
                                err = 'Пользователя с таким ID нет в базе данных.';
                                break;

                            case 2:
                                err = 'Этого пользователя нельзя удалить.';
                                break;

                            case 3:
                                err = 'Пользователь удалён.';
                                break;

                            case 4:
                                err = 'Данные не указаны.';
                                break;

                            default:
                                err = `Неизвестная ошибка. Обратитесь в нашу группу ВК: ${config.supportURI}`;
                                break;
                        }

                        return con.query(`SELECT * FROM panelUsers`)
                            .then((dataUsers) => res.render(`${__dirname}/pages/users.ejs`, { panelName: config.site.name, supportURI: config.supportURI, users: dataUsers, errorCode: err, userToken: req.cookies.userSession }))
                            .catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
                    } else return con.query(`SELECT * FROM panelUsers`)
                        .then((dataUsers) => res.render(`${__dirname}/pages/users.ejs`, { panelName: config.site.name, supportURI: config.supportURI, users: dataUsers, errorCode: "Управление пользователями", userToken: req.cookies.userSession }))
                        .catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
                }
            }
        }).catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
});

app.get('/logout', (req, res) => {
    if(!req.cookies.userSession) return res.redirect('/login?error=3');
    res.cookie('userSession', null, { maxAge: -1 });
    return res.redirect('/login?error=4');
});

app.get('/loginData', (req, res) => {
    if(req.cookies.userSession) return res.redirect('/');
    if(!req.query.login || !req.query.password) return res.redirect('/login?error=2');

    res.cookie('userSession', hash((req.query.login + req.query.password)), { maxAge: 604800000 });
    return res.redirect('/');
});

app.get('/registerData', (req, res) => {
    if(!req.query.login || !req.query.password || !req.query.access || !req.query.token) return res.redirect('/register?error=3');
    con.query(`SELECT * FROM panelUsers WHERE userToken = '${req.query.token}'`)
        .then((data) => {
            if(!data[0]) {
                res.cookie('userSession', null, { maxAge: -1 });
                return res.redirect('/login?error=0');
            } else {
                if(data[0].userAccess < 2) return res.redirect('/register?error=0');
                else return con.query(`SELECT * FROM panelUsers WHERE userLogin = '${req.query.login}'`)
                    .then((reg) => {
                        if(reg[0]) return res.redirect('/register?error=1');
                        else {
                            if(req.query.access > 1 && data[0].userAccess < 3) return res.redirect('/register?error=4');
                            else return con.query(`INSERT INTO panelUsers (userLogin, userToken, userAccess) VALUES ('${req.query.login}', '${hash((req.query.login + req.query.password))}', '${req.query.access}')`)
                                .then(() => res.redirect('/register?error=2'))
                                .catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
                        }
                    }).catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
            }
        }).catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
});

app.get('/delete', (req, res) => {
    if(!req.query.id || !req.query.token) return res.redirect('/users?error=4');
    con.query(`SELECT * FROM panelUsers WHERE userToken = '${req.query.token}'`)
        .then((data) => {
            if(!data[0]) {
                res.cookie('userSession', null, { maxAge: -1 });
                return res.redirect('/login?error=0');
            } else {
                if(data[0].userAccess < 2) return res.redirect('/error?error=-1');
                else return con.query(`SELECT * FROM panelUsers WHERE id = '${req.query.id}'`)
                    .then((reg) => {
                        if(!reg[0]) return res.redirect('/users?error=1');
                        else {
                            if(reg[0].userAccess > 1 && data[0].userAccess < 3) return res.redirect('/users?error=2');
                            else return con.query(`DELETE FROM panelUsers WHERE id = '${req.query.id}'`)
                                .then(() => res.redirect('/users?error=3'))
                                .catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
                        }
                    }).catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
            }
        }).catch((err) => res.send(`${err.stack}<br><br>Пожалуйста, обратитесь в группу ВК: <a href="${config.supportURI}">${config.supportURI}</a>`));
});

app.use((req, res, next) => {
    res.status(404).redirect('/error?error=0&page=' + req.url);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.render(500).redirect('/error?error=1&page=' + req.url);
});

app.listen(config.port, () => console.log('Сервер запущен.'));
