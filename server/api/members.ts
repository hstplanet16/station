const members = [{
  name: 'Umut ALTIN',
  username: 'umut.altin',
  role: 'Yönetici',
  avatar: { src: 'https://ipx.nuxt.com/f_auto,s_192x192/gh_avatar/antfu' }
}, {
  name: 'Ahmet Uzun',
  username: 'ahmet.uzun',
  role: 'Operator',
  avatar: { src: 'https://ipx.nuxt.com/f_auto,s_192x192/gh_avatar/larbish' }
}]

export default eventHandler(async () => {
  return members
})
