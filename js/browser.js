import {CRSearch} from './crsearch'

document.addEventListener('DOMContentLoaded', function() {
  let crs = new CRSearch({
    onDatabase: (db) => {
      console.log('onDatabase', db)
    }
  })
  crs.database('/')
  crs.searchbox(document.getElementsByClassName('crsearch'))
})

