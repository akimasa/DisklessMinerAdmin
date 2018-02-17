var socket = io();
var addr, port
window.onload = function () {
    addr = document.getElementById("addr").textContent
    port = document.getElementById("port").textContent
    var term = new Terminal();
    term.open(document.getElementById('terminal'))
    socket.emit("conn", addr, port)
    socket.on("write", (d) => {
        term.write(d)
    })
    socket.on('ready', () => {
        term.focus();
    })
    term.on("data", (d) => {
        socket.emit("input", d)
    })
    var comBtn = document.getElementsByClassName("command");
    for (var i = 0; i < comBtn.length; i++) {
        var button = comBtn[i]
        button.addEventListener("click", (e) => {
            socket.emit("input", e.target.getAttribute('command'));
        }, true)
    }
}
function execCmd(cmd) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest()
        xhr.onload = () => {
            resolve(xhr.responseText)
        }
        xhr.open('post', 'exec')
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(JSON.stringify({addr,port,cmd}))
    })
}
function send(e) {
    //socket.emit('input', str)
}
function starteth() {
    var pool = document.getElementById("ethpool").value,
        wallet = document.getElementById("ethwallet").value,
        worker = document.getElementById("ethworker").value,
        email = document.getElementById("ethemail").value
    var command = `nohup systemd-cat -t gpuminer ./bin/ethminer --farm-recheck 2000 -U -S ${pool} -O ${wallet}.${worker}/${email} &`
    +`journalctl -af -o cat -t gpuminer\n`
    socket.emit('input', command)
}
function getgpu() {
    //0, GPU-b460cfed-3f52-d134-3bee-2863db1d11e0, 200.00 W, 27.16 W
    var cmd = "nvidia-smi --format=csv,noheader --query-gpu=index,uuid,power.limit,power.draw";
    execCmd(cmd).then((res) => {
        // console.log(res)
        var lines = res.split(/\n/)
        var select = document.createElement("select")
        select.setAttribute("id","gpuindex")
        for (var i = 0; i<lines.length; i++){
            if(lines[i] === "") {
                continue
            }
            (function() {
                var csv = lines[i].split(/,/)
                var option = document.createElement("option")
                option.innerText = `${csv[0]}: ${csv[1]} Power: ${csv[3]}/${csv[2]}`
                option.value = JSON.stringify({index: csv[0], uuid:csv[1]})
                select.appendChild(option)
            })()
        }
        document.getElementById("gpu").innerHTML = ""
        document.getElementById("gpu").appendChild(select)
        document.getElementById("gputweak").style.display = "block"
        
    })
}
function setpower(){
    var index = JSON.parse(document.getElementById("gpuindex").value).index
    socket.emit('input', `nvidia-smi -i ${index} -pm 1; nvidia-smi -i ${index} -pl ${document.getElementById("powerlimit").value}\n`)
}
function initmemoffset(){
    socket.emit('input', "nvidia-xconfig --enable-all-gpus; nvidia-xconfig --cool-bits=8; nohup startx -- :0 1>/dev/null 2>/dev/null&\n")
}
function setmemoffset(){
    var uuid = JSON.parse(document.getElementById("gpuindex").value).uuid
    socket.emit('input', `nvidia-settings -c :0 -a '[gpu:${uuid}]/GPUMemoryTransferRateOffset[3]=${document.getElementById("memoffset").value}'\n`)
}