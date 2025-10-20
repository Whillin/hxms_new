import http from 'node:http'

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${path}`,(res)=>{
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>resolve({status:res.statusCode,body:d}));
    }).on('error',reject)
  })
}

(async()=>{
  try{
    const resp = await get('/api/employee/list?current=1&size=5')
    console.log('status:', resp.status)
    console.log(resp.body)
  }catch(e){
    console.error(e)
    process.exitCode = 1
  }
})();