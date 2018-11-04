/*var update = document.getElementById('update')

update.addEventListener('click', function(){
  
  alert("update button is clicked')
  fetch('quotes', {
    method: 'put',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      'name': 'Admin',
      'quote': 'I find your lack of faith disturbing.'
    })
  })
  .then(res => {
    if (res.ok) return res.json()
  })
  .then(data => {
    console.log(data)
  })
})
*/

function main(){
  alert("I am in Main")
}
