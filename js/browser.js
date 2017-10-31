import {CRSearch} from './crsearch'

document.addEventListener('DOMContentLoaded', function() {
  let crs = new CRSearch
  crs.database('/')
  crs.searchbox(document.getElementsByClassName('crsearch'))
})

