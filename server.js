const path = require('path');
const URL = require('url');
const jsonServer = require('json-server');
const { PORT, APS_SAMPLE_ENVIRONMENT, APS_MAXIMUM_MARKUPS_NUMBER } = require('./config.js');

const router = jsonServer.router(path.join(__dirname, './services/db.json'), { foreignKeySuffix: '_id' });

const app = jsonServer.create();
app.use(jsonServer.defaults({
    static: path.join(__dirname, './wwwroot'),
    bodyParser: true
}));

app.use(require('./routes/auth.js'));
app.use(require('./routes/models.js'));
app.use(require('./routes/state.js'));
app.use(jsonServer.rewriter({ '/api/*': '/$1' }));

if (APS_SAMPLE_ENVIRONMENT == 'Demonstration') {
    console.log(`Server running on Demonstration mode...`);
    app.use(async (req, res, next) => {
        try {
            if (req.url.includes('markups') && req.method != 'GET') {
                let url = URL.parse(req.url);
                let pathNames = url.pathname.split('/');
                let id = parseInt(pathNames[pathNames.length - 1]);

                if (req.method == 'POST' && req.body) {
                    let data = req.body;
                    await router.db.read();
                    let markupEntities = router.db.get('markups').filter(d => d.urn == data.urn && d.guid == data.guid);
                    let markups = markupEntities.value();
                    if (markups.length >= APS_MAXIMUM_MARKUPS_NUMBER)
                        throw new Error(`Demo mode doesn't support having more than ${APS_MAXIMUM_MARKUPS_NUMBER} \`markups\` in total.`);
                }
                // } else if (req.method == 'DELETE') {
                //     let sensor = router.db.get('markups').find({ id }).value();
                //     if (sensor && sensor.immutable)
                //         throw new Error(`Demo mode doesn't support deleting demo markups data. Try to add your markups by clicking the \`+\` button on the toolbar.`);
                // } else {
                //     throw new Error(`Demo mode doesn't support manipulating \`markups\` data.`);
                //}
            }

            next();
        } catch (error) {
            res.status(403).json({
                code: 403,
                error: 'Unsupported Operation',
                detail: error.message
            });
        }
    });
}

app.use(router);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send(err.message);
});

app.listen(PORT, function () { console.log(`Server listening on port ${PORT}...`); });
