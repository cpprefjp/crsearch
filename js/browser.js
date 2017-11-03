import {CRSearch} from './crsearch'

import * as KC from './crsearch/kunai-config'
import {IndexType as IType} from './crsearch/index-type'

import {Logger} from 'nagato'


document.addEventListener('DOMContentLoaded', () => {
  const log = new Logger(['CRSearch', 'Test'])

  let crs = new CRSearch({
    onDatabase: (db) => {
      const mc = new KC.Config({
        'cpp.json': require('../kunai_configs/cpprefjp/cpp.json'),
      })

      log.info('onDatabase', db)

      {
        // sample indexes
        const ns = db.exactNamespace(['reference'], null)
        const idxs = ns.findIndex((idx) => {
          return idx.type() === IType.mem_fun
        })

        log.info('sample Index', idxs)

        for (const idx of idxs) {
          const prio = mc.priorityFor(idx)
          log.info(`priority for Index '${idx}': ${prio.i}`, prio)
        }
      }

      {
        db.getTree()
      }
    }
  })
  crs.database('/')
  crs.searchbox(document.getElementsByClassName('crsearch'))
})

