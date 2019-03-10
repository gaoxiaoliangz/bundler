export default msg => {
  const t = new Date()
  const s = `${t.getHours()}:${t.getMinutes()}:${t.getSeconds()} `
  console.log(s, msg)
}
