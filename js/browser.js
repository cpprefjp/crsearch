import {CRSearch} from './crsearch'
import {IndexType as IType} from './crsearch/index-type'

import KC_Article from '../kunai_configs/cpprefjp/article.md'
import * as KC from './crsearch/kunai-config'

import {Logger} from 'nagato'


document.addEventListener('DOMContentLoaded', () => {
  const log = new Logger(['CRSearch', 'Test'])

  let crs = new CRSearch({
    onDatabase: (db) => {
      const kc = new KC.Config({
        'article.md': KC_Article,
        'cpp.json': require('../kunai_configs/cpprefjp/cpp.json'),
      })

      log.info('onDatabase', db)

      {
        // sample indexes
        const ns = db.exactNamespace(['reference'], null)
        const idxs = ns.findIndex((idx) => {
          return idx.type() === IType.mem_fun
        })

        // log.info('sample Index', idxs)

        for (const idx of idxs) {
          const prio = kc.priorityForIndex(idx)
          // log.info(`priority for Index '${idx}': ${prio.i}`, prio)
        }
      }

      {
        const tree = db.sortTree(kc, db.getTree())
        log.info('tree', tree)
      }
    }
  })
  crs.database('/')
  crs.searchbox(document.getElementsByClassName('crsearch'))
})

