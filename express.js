const express = require('express')
const app = express()
const server = require('http').createServer(app);
const io = require('socket.io')(server, { wsEngine: "ws" })
const bonjour = require('bonjour')()
const sshClient = require('ssh2').Client;
const bodyParser = require('body-parser')
const ip = require('ip')
const arp = require('node-arp')
var settings


io.on('connection', (sock) => {
    var sshc = new sshClient();
    sock.on("conn", (host, port) => {
        sock.emit("write", `Connecting to: ${host}:${port}`)
        sshc.on('ready', () => {
            sock.emit('ready')
            sshc.shell(true, (err, channel) => {
                channel.on('close', () => {
                    sshc.end()
                    sock.emit("write", "close")
                }).on('data', (d) => {
                    sock.emit('write', d.toString());
                }).stderr.on('data', (d) => {
                    sock.emit('write', d.toString())
                })
                sock.on("input", (d) => {
                    channel.write(d)
                })
            })
        }).connect({
            host,
            port,
            username: 'root',
            privateKey: require('fs').readFileSync(__dirname + '/sshkey')
        })
    })
    sock.on("setsetting", (name, data) => {
        settings.set(name, data)
    })
    sock.on("getsetting", (event, data) => {
        var d = settings.get(data)
        sock.emit(event, event, d)
    })
    sock.on("disconnect", () => {
        sshc.end(); //???
    })
});

app.set('view engine', 'pug')
app.set('views', __dirname + '/views')

const jsonParser = bodyParser.json()

app.use('/js', express.static(__dirname + '/js'))
app.use('/xterm', express.static(__dirname + '/node_modules/xterm/dist'))
var services = []
var discoverTimer, discoverBrowser = null;
app.get('/discover', (req, res) => {
    if (services.length == 0 || req.query.refresh == 1) {
        if (discoverBrowser !== null) {
            clearTimeout(discoverTimer)
            discoverBrowser.stop()
        }
        services = []
        discoverBrowser = bonjour.find({ type: "ssh" }, (service) => {
            for (var i = 0; i < service.addresses.length; i++) {
                var addr = service.addresses[i]
                if (ip.isV4Format(addr)) {
                    arp.getMAC(addr, (err, mac) => {
                        if (!err) {
                            service.mac = mac
                            service.validaddr = addr
                        }
                    })
                }
            }
            services.push(service)
        })
        discoverTimer = setTimeout(() => {
            discoverBrowser.stop()
            discoverBrowser = null
        }, 10000)
        setTimeout(() => {
            // res.contentType = "application/json"
            // res.send(JSON.stringify(services))
            res.render('discover', { services })
        }, 1000)

    } else {
        res.render('discover', { services })
    }

});
app.get('/host', (req, res) => {
    res.render('host', JSON.parse(req.query.host))
})
app.get('/hostadm', (req, res) => {
    res.render('hostadm', { addr: req.query.addr, port: req.query.port })
})
app.post('/exec', jsonParser, (req, res) => {
    var result = ""
    var host = req.body.addr
    var port = req.body.port
    var cmd = req.body.cmd
    var sshc = new sshClient();
    sshc.on('ready', () => {
        sshc.exec(cmd, (err, channel) => {
            channel.on('close', () => {
                res.send(result)
                sshc.end()
            }).on('data', (d) => {
                result += d.toString()
            }).stderr.on('data', (d) => {
                io.emit('write', d.toString())
            })
        })
    }).connect({
        host,
        port,
        username: 'root',
        privateKey: require('fs').readFileSync(__dirname + '/sshkey')
    })
})

app.get('/', (req, res) => {
    res.render('index')
});
exports.init = (s) => {
    server.listen(3000)
    settings = s
}