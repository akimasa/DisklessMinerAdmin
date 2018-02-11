const xhr = new XMLHttpRequest()
xhr.onload = () => {
    location.href = "discover"
}
xhr.open('get','discover')
xhr.send()