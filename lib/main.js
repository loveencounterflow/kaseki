(function() {
  'use strict';
  var CP, GUY, Kaseki, PATH, _as_cli_parameters, alert, debug, echo, get_kaseki_types, help, info, inspect, log, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('KASEKI'));

  ({rpr, inspect, echo, log} = GUY.trm);

  ({get_kaseki_types} = require('./types'));

  CP = require('node:child_process');

  PATH = require('node:path');

  _as_cli_parameters = null;

  (function() {    //===========================================================================================================
    var isa, type_of;
    ({isa, type_of} = get_kaseki_types());
    //.........................................................................................................
    _as_cli_parameters = function(...P) {
      /* Given any number of arguments, turn them into a list of strings, potentially usable as the `args`
      input for NodeJS's `child_process.spawn()` method ('potentially' here meaning that unless checks on
      parameter names and values are performed, the returned list may not be a suitable input).

      The method allows for any number of positional and named arguments. Positional arguments will result
      from primitive values, most often texts, numbers, and booleans. Objects with key/value pairs, on the
      other hand, will be turned into named arguments. Underscores in keys will be replaced by hyphens.
      Single-letter keys will be prefixed with a single hyphen, longer ones with two hyphens. Empty strings as
      keys are not allowed.

      While it is possible to nest objects, it's probably a good idea not to use that 'feature' which is not
      safeguarded against for the sole reason that this routine is not meant for public consumption. */
      var R, i, j, key, len, len1, p, prefix, ref, type, value, x;
      R = [];
      for (i = 0, len = P.length; i < len; i++) {
        p = P[i];
        switch (type = type_of(p)) {
          case 'text':
            R.push(p);
            break;
          case 'float':
          case 'boolean':
            R.push(`${p}`);
            break;
          case 'object':
            for (key in p) {
              value = p[key];
              if (key.length === 0) {
                throw new Error(`^kaseki@1^ detected empty key in ${rpr(P)}`);
              }
              key = key.replace(/_/g, '-');
              prefix = key.length === 1 ? '-' : '--';
              R.push(prefix + key);
              if (value == null) {
                continue;
              }
              ref = _as_cli_parameters(value);
              for (j = 0, len1 = ref.length; j < len1; j++) {
                x = ref[j];
                R.push(x);
              }
            }
            break;
          default:
            throw new Error(`^kaseki@1^ unable to convert a ${type} to text`);
        }
      }
      return R;
    };
    //.........................................................................................................
    return null;
  })();

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
        cwd: this.cfg.work_path,
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
      return ((this._spawn('fossil', 'ls')).split('\n')).filter(function(x) {
        return x !== '';
      });
    }

    list_file_paths() {
      var i, len, name, ref, results;
      ref = this.list_file_names();
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        name = ref[i];
        results.push(PATH.join(this.cfg.work_path, name));
      }
      return results;
    }

    open() {
      return this._spawn('fossil', 'open', this.cfg.repo_path);
    }

    ls() {
      return this.list_file_names();
    }

    change_texts() {
      return ((this._spawn('fossil', 'changes')).split('\n')).filter(function(x) {
        return x !== '';
      });
    }

    has_changes() {
      return this.change_texts().length > 0;
    }

    list_of_changes() {
      var i, len, ref, results, t;
      ref = this.change_texts();
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        t = ref[i];
        results.push([t.slice(11), t.slice(0, 11).trimEnd().toLowerCase()]);
      }
      return results;
    }

    changes_by_file() {
      return Object.fromEntries(this.list_of_changes());
    }

    //.........................................................................................................
    /* NOTE first arguments of the methods possibly to be made optional `cfg` objects */
    add(path) {
      return this._spawn('fossil', 'add', path);
    }

    commit(message) {
      return this._spawn('fossil', 'commit', '-m', message);
    }

    //---------------------------------------------------------------------------------------------------------
    init(cfg) {
      var error, init;
      init = () => {
        return this._spawn('fossil', 'init', this.cfg.repo_path);
      };
      cfg = this.types.create.ksk_init_cfg(cfg);
      try {
        init();
      } catch (error1) {
        error = error1;
        if (error.message.startsWith('file already exists:')) {
          if (cfg.if_exists === 'ignore') {
            return null;
          }
        }
        throw new Error(`when trying to \`init\` repo ${this.cfg.repo_path}, an error occurred: ${error.message}`);
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _status() {
      var R, _, entries, k, line, lines, v;
      R = this._spawn('fossil', 'status');
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
          if (k != null) {
            results.push([k, v]);
          }
        }
        return results;
      })());
    }

    //---------------------------------------------------------------------------------------------------------
    status() {
      var R, g, k, match, ref, ref1, v;
      R = {};
      ref = this._status();
      for (k in ref) {
        v = ref[k];
        switch (k) {
          case 'repository':
            R.repo_path = v;
            break;
          case 'local-root':
            R.work_path = v;
            break;
          case 'config-db':
            R.cfg_path = v;
            break;
          case 'checkout':
          case 'parent':
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
            if ((match = v.match(/(?<message>^.*)\(user:\s+(?<user>\S+)\)$/)) != null) {
              R.message = match.groups.message.trim();
              R.user = match.groups.user.trim();
            } else {
              R.message = v;
              R.user = null;
            }
            break;
          default:
            R[k] = v;
        }
      }
      return R;
    }

  };

  //===========================================================================================================
  module.exports = {Kaseki, _as_cli_parameters};

}).call(this);

//# sourceMappingURL=main.js.map