"use strict";

import CRSearch from './crsearch'

import KC_Article from '../kunai_configs/cpprefjp/article.md'
import * as KC from './crsearch/kunai-config'

import {Logger} from 'nagato'


document.addEventListener('DOMContentLoaded', () => {
  const log = new Logger(['CRSearch', 'Test'])

  const crs = new CRSearch({
    onDatabase: db => {
      const kc = new KC.Config({
        'article.md': KC_Article,
        'cpp.json': require('../kunai_configs/cpprefjp/cpp.json'),
      })

      log.info('onDatabase', db)

      {
        const tree = db.getTree(kc)
        log.info('tree', tree)
      }
    }
  })
  crs.database('/')
  crs.searchbox(document.getElementsByClassName('crsearch'))
})

