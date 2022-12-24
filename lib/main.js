(function() {
  'use strict';
  var CP, Fossil, GUY, Git, Intercom, Kaseki, PATH, _as_cli_parameters, alert, debug, echo, get_kaseki_types, help, info, inspect, log, plain, praise, rpr, urge, warn, whisper;

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
  Intercom = class Intercom {
    //=========================================================================================================
    // CONSTRUCTION
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var env, my_env;
      GUY.props.hide(this, 'types', get_kaseki_types());
      this.cfg = this.types.create.ic_constructor_cfg(cfg);
      my_env = {
        LANG: 'C',
        LANGUAGE: 'C',
        LC_ALL: 'C'
      };
      env = {...process.env, ...my_env};
      GUY.props.hide(this, 'spawn_cfg', {
        cwd: this.cfg.work_path,
        encoding: 'utf-8',
        env: env
      });
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    spawn(cmd, ...parameters) {
      return this._spawn_inner(cmd, parameters);
    }

    _spawn_inner(cmd, parameters, cfg = null) {
      var R, cmd_line;
      cfg = cfg != null ? {...this.spawn_cfg, ...cfg} : this.spawn_cfg;
      R = CP.spawnSync(cmd, parameters, cfg);
      if (R.status !== 0) {
        if (R.error != null) {
          cmd_line = cmd;
          if (parameters.length > 0) {
            cmd_line = cmd + ' ' + parameters.join(' ');
          }
          throw new Error(`^kaseki@1^ when trying to execute ${rpr(cmd_line)} in directory ${cfg.cwd}, ` + `an error occurred: ${R.error}`);
        }
        throw new Error(R.stderr);
      }
      return R.stdout.replace(/\n$/, '');
    }

    //---------------------------------------------------------------------------------------------------------
    _as_lines(text) {
      return (text.split('\n')).filter(function(x) {
        return x !== '';
      });
    }

  };

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
      GUY.props.hide(this, 'ic', new Intercom({
        work_path: this.cfg.work_path
      }));
      return void 0;
    }

  };

  //===========================================================================================================
  Fossil = class Fossil extends Kaseki {
    //---------------------------------------------------------------------------------------------------------
    ls() {
      return this.list_file_names();
    }

    list_file_names() {
      return this.lns_ls();
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
      return this.raw_open(this.cfg.repo_path);
    }

    has_changes() {
      return this.lns_changes().length > 0;
    }

    list_of_changes() {
      var i, len, ref, results, t;
      ref = this.lns_changes();
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
      return this.ic.spawn('fossil', 'add', path);
    }

    commit(message) {
      return this.ic.spawn('fossil', 'commit', '-m', message);
    }

    //---------------------------------------------------------------------------------------------------------
    init(cfg) {
      var error, init;
      init = () => {
        return this.ic.spawn('fossil', 'init', this.cfg.repo_path);
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
      R = this.ic.spawn('fossil', 'status');
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

  (function() {    //===========================================================================================================
    /* TAINT must translate commands that start with digit */
    var command, commands, i, len;
    commands = ['3-way-merge', 'add', 'addremove', 'alerts', 'all', 'amend', 'annotate', 'artifact', 'attachment', 'backoffice', 'backup', 'bisect', 'blame', 'branch', 'bundle', 'cache', 'cat', 'cgi', 'changes', 'chat', 'checkout', 'co', 'cherry-pick', 'clean', 'clone', 'close', 'commit', 'ci', 'configuration', 'dbstat', 'deconstruct', 'delete', 'descendants', 'describe', 'detach', 'diff', 'export', 'extras', 'finfo', 'forget', 'fts-config', 'fusefs', 'gdiff', 'git', 'grep', 'hash-policy', 'help', 'hook', 'http', 'import', 'info', 'init', 'new', 'interwiki', 'leaves', 'login-group', 'ls', 'md5sum', 'merge', 'merge-base', 'mv', 'open', 'patch', 'pikchr', 'praise', 'publish', 'pull', 'purge', 'push', 'rebuild', 'reconstruct', 'redo', 'remote', 'remote-url', 'rename', 'reparent', 'revert', 'rm', 'rss', 'scrub', 'search', 'server', 'settings', 'sha1sum', 'sha3sum', 'shell', 'sql', 'sqlar', 'sqlite3', 'ssl-config', 'stash', 'status', 'sync', 'tag', 'tarball', 'ticket', 'timeline', 'tls-config', 'touch', 'ui', 'undo', 'unpublished', 'unset', 'unversioned', 'uv', 'update', 'user', 'version', 'whatis', 'wiki', 'xdiff', 'zip'];
    for (i = 0, len = commands.length; i < len; i++) {
      command = commands[i];
      ((command) => {
        var lns_name, raw_name;
        raw_name = `raw_${command}`;
        lns_name = `lns_${command}`;
        Kaseki.prototype[raw_name] = function(...P) {
          return this.ic._spawn_inner('fossil', [command, ...(_as_cli_parameters(...P))]);
        };
        return Kaseki.prototype[lns_name] = function(...P) {
          return this.ic._as_lines(this[raw_name](...P));
        };
      })(command);
    }
    return null;
  })();

  //===========================================================================================================
  Git = class Git extends Kaseki {
    //---------------------------------------------------------------------------------------------------------
    _git_init() {
      return this.ic._spawn_inner('git', ['init']);
    }

    _git_status_sb() {
      return this.ic._spawn_inner('git', ['status', '-sb']);
    }

    //---------------------------------------------------------------------------------------------------------
    _add_and_commit_all(message = '???') {
      this.ic._spawn_inner('git', ['add', '.']);
      return this.ic._spawn_inner('git', ['commit', '-m', message]);
    }

    //---------------------------------------------------------------------------------------------------------
    status() {
      var R, head, i, len, line, match, tail;
      [head, ...tail] = this.ic._as_lines(this._git_status_sb());
      R = this.types.create.ksk_git_status_cfg();
      //.......................................................................................................
      if ((match = head.match(/^## No commits yet on (?<local_branch>.*?)$/))) {
        R.local_branch = match.groups.local_branch;
      //.......................................................................................................
      } else if ((match = head.match(/^##\s+(?<local_branch>.*?)\.\.\.(?<remote_branch>\S+).*$/))) {
        R.local_branch = match.groups.local_branch;
        R.remote_branch = match.groups.remote_branch;
      //.......................................................................................................
      } else if ((match = head.match(/^##\s+(?<local_branch>.*?)$/))) {
        R.local_branch = match.groups.local_branch;
      }
//.......................................................................................................
      for (i = 0, len = tail.length; i < len; i++) {
        line = tail[i];
        if (/^(?<code>..)\x20(?<path>.+)$/.test(line)) {
          R.dirty_count++;
        }
      }
      //.......................................................................................................
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    log(cfg) {
      var R, date_iso, format, hash, i, len, line, message, ref;
      cfg = this.types.create.ksk_git_log_cfg(cfg);
      format = "--pretty=format:%h%x09%aI%x09%s";
      R = [];
      ref = this.ic._as_lines(this.ic.spawn('git', 'log', format, '--since', cfg.since));
      for (i = 0, len = ref.length; i < len; i++) {
        line = ref[i];
        [hash, date_iso, message] = line.split('\t');
        R.push({hash, date_iso, message});
      }
      return R;
    }

  };

  //===========================================================================================================
  module.exports = {Kaseki, Fossil, Git, _as_cli_parameters};

}).call(this);

//# sourceMappingURL=main.js.map