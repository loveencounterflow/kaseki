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
      /* TAINT use types */
      GUY.props.hide(this, 'spawn_cfg', {
        cwd: this.cfg.checkout_path,
        encoding: 'utf-8'
      });
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _spawn(cmd, ...parameters) {
      return this._spawn_inner(cmd, parameters);
    }

    _spawn_inner(cmd, parameters, cfg = null) {
      var R, cmd_line;
      cfg = cfg != null ? {...this.spawn_cfg, ...cfg} : this.spawn_cfg;
      R = CP.spawnSync(cmd, parameters, cfg);
      if (R.status !== 0) {
        if (R.error != null) {
          cmd_line = cmd + ' ' + parameters.join(' ');
          throw new Error(`^kaseki@1^ when trying to execute ${rpr(cmd_line)} in directory ${cfg.cwd},` + ` an error occurred: ${R.error}`);
        }
        throw new Error(R.stderr);
      }
      return R.stdout.replace(/\n$/, '');
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
      var R, g, k, ref, ref1, v;
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
            R.cfg_path = v;
            break;
          case 'checkout':
          case 'parent':
            // '56ae7533ba4c93de3e4cd54378e86019e04484d8 2022-12-11 10:58:54 UTC',
            if ((g = (ref1 = v.match(/^(?<id>[0-9a-f]+)\s+(?<ts>.+)$/)) != null ? ref1.groups : void 0) == null) {
              throw new Error(`^kaseki@1^ unable to parse ID with timestamp ${rpr(v)}`);
            }
            R[`${k}_id`] = g.id;
            R[`${k}_ts`] = GUY.datetime.srts_from_isots(g.ts);
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
      var FS;
      FS = require('node:fs');
      GUY.temp.with_directory(function({
          path: repo_home
        }) {
        return GUY.temp.with_directory(function({
            path: checkout_home
          }) {
          var checkout_path, k, ksk, ref, repo_path, v;
          debug('^34-1^', rpr(repo_home));
          debug('^34-1^', rpr(checkout_home));
          repo_path = PATH.join(repo_home, 'kaseki-demo.fossil');
          checkout_path = PATH.join(checkout_home);
          ksk = new Kaseki({repo_path, checkout_path});
          // urge  '^34-2^', ksk._spawn_inner 'realpath', [ '.', ], { cwd: repo_home, }
          // urge  '^34-3^', ksk._spawn_inner 'ls', [ '-AlF', '.', ], { cwd: repo_home, }
          info('^34-4^', rpr(ksk.get_fossil_version_text()));
          // debug '^34-5^', ksk._spawn 'ls', '-AlF', '.'
          // debug '^34-6^', ksk._spawn 'realpath', '.'
          urge('^34-7^', ksk._spawn('fossil', 'init', repo_path));
          urge('^34-7^', ksk._spawn('fossil', 'open', repo_path));
          urge('^34-7^', ksk._spawn('fossil', 'ls'));
          urge('^34-8^', ksk.list_file_names());
          urge('^34-9^', ksk.list_file_paths());
          urge('^34-10^', rpr(ksk.status_text()));
          urge('^34-11^', ksk.fossil_status());
          help('^34-12^', ksk.status());
          ref = ksk.status();
          for (k in ref) {
            v = ref[k];
            info('^34-13^', k.padEnd(20), v);
          }
          urge('^34-7^', FS.readdirSync(repo_home));
          return urge('^34-7^', FS.readdirSync(checkout_home));
        });
      });
      return null;
    })();
  }

}).call(this);

//# sourceMappingURL=main.js.map