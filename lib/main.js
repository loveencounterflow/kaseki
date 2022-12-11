(function() {
  'use strict';
  var CP, GUY, Kaseki, PATH, alert, debug, echo, get_kaseki_types, help, info, inspect, log, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('KASEKI'));

  ({rpr, inspect, echo, log} = GUY.trm);

  ({get_kaseki_types} = require('./types'));

  CP = require('node:child_process');

  PATH = require('node:path');

  //===========================================================================================================
  Kaseki = class Kaseki {
    //=========================================================================================================
    // CONSTRUCTION
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      // super()
      GUY.props.hide(this, 'types', get_kaseki_types());
      this.cfg = this.types.create.ksk_constructor_cfg(cfg);
      GUY.props.hide(this, 'spawn_cfg', {
        cwd: this.cfg.checkout_path
      });
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _spawn(cmd, ...parameters) {
      return this._spawn_inner(cmd, parameters);
    }

    _spawn_inner(cmd, parameters, cfg = null) {
      var R;
      cfg = cfg != null ? {...this.spawn_cfg, ...cfg} : this.spawn_cfg;
      R = CP.spawnSync(cmd, parameters, cfg);
      if (R.status !== 0) {
        if (R.error != null) {
          throw new R.error();
        }
        throw new Error(R.stderr.toString('utf-8'));
      }
      return (R.stdout.toString('utf-8')).replace(/\n$/, '');
    }

    //---------------------------------------------------------------------------------------------------------
    get_fossil_version_text() {
      return this._spawn('fossil', 'version');
    }

    //---------------------------------------------------------------------------------------------------------
    list_file_names() {
      return (this._spawn('fossil', 'ls')).split('\n');
    }

    list_file_paths() {
      var i, len, name, ref, results;
      ref = this.list_file_names();
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        name = ref[i];
        results.push(PATH.join(this.cfg.checkout_path, name));
      }
      return results;
    }

    status_text() {
      return this._spawn('fossil', 'status');
    }

    //---------------------------------------------------------------------------------------------------------
    fossil_status() {
      /*
        repository: '/home/flow/3rd-party-repos/fossils/datamill-doc-demo.fossil',
        local-root: '/home/flow/3rd-party-repos/sqlite-archiver/demo/fossil-unpacked/',
        config-db:  '/home/flow/.config/fossil.db',
        checkout:   '56ae7533ba4c93de3e4cd54378e86019e04484d8 2022-12-11 10:58:54 UTC',
        parent:     'bce48ab77a9432b544577c2b200544bcfcfd2c9c 2022-12-11 10:55:57 UTC',
        tags:       'trunk',
        comment:    'first (user: flow)'
      */
      var R, _, entries, k, line, lines, v;
      R = this.status_text();
      if (!/^[^\s:]+:\s+\S+/.test(R)) {
        return {
          error: R
        };
      }
      lines = R.split('\n');
      entries = (function() {
        var i, len, results;
        results = [];
        for (i = 0, len = lines.length; i < len; i++) {
          line = lines[i];
          results.push(line.split(/^([^:]+):\s+(.*)$/));
        }
        return results;
      })();
      return Object.fromEntries((function() {
        var i, len, results;
        results = [];
        for (i = 0, len = entries.length; i < len; i++) {
          [_, k, v] = entries[i];
          results.push([k, v]);
        }
        return results;
      })());
    }

    //---------------------------------------------------------------------------------------------------------
    status() {
      var R, k, ref, v;
      R = {};
      ref = this.fossil_status();
      for (k in ref) {
        v = ref[k];
        switch (k) {
          case 'repository':
            R.repo_path = v;
            break;
          case 'local-root':
            R.checkout_path = v;
            break;
          case 'config-db':
            R.cfg_db = v;
            break;
          case 'checkout':
          case 'parent':
            // '56ae7533ba4c93de3e4cd54378e86019e04484d8 2022-12-11 10:58:54 UTC',
            R[`${k}_id`] = '???';
            R[`${k}_ts`] = '???';
            break;
          case 'tags':
            R.tags = v/* TAINT should split tags, return list */
            break;
          case 'comment':
            R.comment = v/* TAINT should parse user name */
            break;
          default:
            R[k] = v;
        }
      }
      return R;
    }

  };

  //===========================================================================================================
  module.exports = {Kaseki};

  //###########################################################################################################
  if (module === require.main) {
    (() => {
      var checkout_path, k, ksk, ref, repo_path, v;
      repo_path = PATH.resolve(PATH.join(__dirname, '../../../3rd-party-repos/fossils/datamill-doc-demo.fossil'));
      checkout_path = PATH.resolve(PATH.join(__dirname, '../../../3rd-party-repos/sqlite-archiver/demo/fossil-unpacked'));
      ksk = new Kaseki({repo_path, checkout_path});
      info('^345^', rpr(ksk.get_fossil_version_text()));
      debug('^345^', ksk._spawn('ls', '-AlF', '.'));
      debug('^345^', ksk._spawn('realpath', '.'));
      urge('^345^', ksk._spawn('fossil', 'ls'));
      urge('^345^', ksk.list_file_names());
      urge('^345^', ksk.list_file_paths());
      urge('^345^', ksk.status_text());
      urge('^345^', ksk.fossil_status());
      help('^345^', ksk.status());
      ref = ksk.status();
      for (k in ref) {
        v = ref[k];
        info('^345^', k.padEnd(20), v);
      }
      return null;
    })();
  }

}).call(this);

//# sourceMappingURL=main.js.map