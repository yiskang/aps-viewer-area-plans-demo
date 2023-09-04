const path = require('path');
const jsonServer = require('json-server');
const { PORT } = require('./config.js');

const router = jsonServer.router(path.join(__dirname, './services/db.json'), { foreignKeySuffix: '_id' });

const app = jsonServer.create();
app.use(jsonServer.defaults({
    static: path.join(__dirname, './wwwroot'),
    bodyParser: true
}));

app.use(require('./routes/auth.js'));
app.use(require('./routes/models.js'));
app.use(jsonServer.rewriter({ '/api/*': '/$1' }));
app.use(router);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send(err.message);
});

app.listen(PORT, function () { console.log(`Server listening on port ${PORT}...`); });
