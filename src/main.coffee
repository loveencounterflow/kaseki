
'use strict'


############################################################################################################
GUY                       = require 'guy'
{ alert
  debug
  help
  info
  plain
  praise
  urge
  warn
  whisper }               = GUY.trm.get_loggers 'KASEKI'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
{ get_kaseki_types }      = require './types'
CP                        = require 'node:child_process'
PATH                      = require 'node:path'
_as_cli_parameters        = null


#===========================================================================================================
do ->
  { isa,
    type_of } = get_kaseki_types()
  #.........................................................................................................
  _as_cli_parameters = ( P... ) ->
    ### Given any number of arguments, turn them into a list of strings, potentially usable as the `args`
    input for NodeJS's `child_process.spawn()` method ('potentially' here meaning that unless checks on
    parameter names and values are performed, the returned list may not be a suitable input).

    The method allows for any number of positional and named arguments. Positional arguments will result
    from primitive values, most often texts, numbers, and booleans. Objects with key/value pairs, on the
    other hand, will be turned into named arguments. Underscores in keys will be replaced by hyphens.
    Single-letter keys will be prefixed with a single hyphen, longer ones with two hyphens. Empty strings as
    keys are not allowed.

    While it is possible to nest objects, it's probably a good idea not to use that 'feature' which is not
    safeguarded against for the sole reason that this routine is not meant for public consumption. ###
    R = []
    for p in P
      switch type = type_of p
        when 'text'             then R.push p
        when 'float', 'boolean' then R.push "#{p}"
        when 'object'
          for key, value of p
            throw new Error "^kaseki@1^ detected empty key in #{rpr P}" if key.length is 0
            key     = key.replace /_/g, '-'
            prefix  = if key.length is 1 then '-' else '--'
            R.push prefix + key
            continue unless value?
            R.push x for x in _as_cli_parameters value
        else
          throw new Error "^kaseki@1^ unable to convert a #{type} to text"
    return R
  #.........................................................................................................
  return null


#===========================================================================================================
class Intercom

  #=========================================================================================================
  # CONSTRUCTION
  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    GUY.props.hide @, 'types', get_kaseki_types()
    @cfg        = @types.create.ic_constructor_cfg cfg
    my_env      =
      LANG:       'C'
      LANGUAGE:   'C'
      LC_ALL:     'C'
    env = { process.env..., my_env..., }
    GUY.props.hide @, 'spawn_cfg',
      cwd:        @cfg.work_path
      encoding:   'utf-8'
      env:        env
    return undefined

  #---------------------------------------------------------------------------------------------------------
  spawn: ( cmd, parameters... ) -> @_spawn_inner cmd, parameters
  _spawn_inner: ( cmd, parameters, cfg = null ) ->
    cfg = if cfg? then { @spawn_cfg..., cfg..., } else @spawn_cfg
    R   = CP.spawnSync cmd, parameters, cfg
    if R.status isnt 0
      if R.error?
        cmd_line = cmd
        cmd_line = cmd + ' ' + parameters.join ' ' if parameters.length > 0
        throw new Error "^kaseki@1^ when trying to execute #{rpr cmd_line} in directory #{cfg.cwd}, " + \
          "an error occurred: #{R.error}"
      throw new Error R.stderr
    return R.stdout.replace /\n$/, ''

  #---------------------------------------------------------------------------------------------------------
  _as_lines: ( text ) -> ( text.split '\n' ).filter ( x ) -> x isnt ''


#===========================================================================================================
class Kaseki

  #=========================================================================================================
  # CONSTRUCTION
  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    # super()
    GUY.props.hide @, 'types', get_kaseki_types()
    @cfg        = @types.create.ksk_constructor_cfg cfg
    ### TAINT use types ###
    GUY.props.hide @, 'ic', new Intercom { work_path: @cfg.work_path, }
    return undefined

#===========================================================================================================
class Fossil extends Kaseki

  #---------------------------------------------------------------------------------------------------------
  ls:               -> @list_file_names()
  list_file_names:  -> @lns_ls()
  list_file_paths:  -> ( PATH.join @cfg.work_path, name for name in @list_file_names() )
  open:             -> @raw_open @cfg.repo_path
  has_changes:      -> @lns_changes().length > 0
  list_of_changes:  -> ( [ t[ 11 .. ], t[ .. 10 ].trimEnd().toLowerCase(), ] for t in @lns_changes() )
  changes_by_file:  -> Object.fromEntries @list_of_changes()
  #.........................................................................................................
  ### NOTE first arguments of the methods possibly to be made optional `cfg` objects ###
  add:              ( path    ) -> @ic.spawn 'fossil', 'add', path
  commit:           ( message ) -> @ic.spawn 'fossil', 'commit', '-m', message

  #---------------------------------------------------------------------------------------------------------
  init: ( cfg ) ->
    init = => @ic.spawn 'fossil', 'init', @cfg.repo_path
    cfg = @types.create.ksk_init_cfg cfg
    try init() catch error
      if error.message.startsWith 'file already exists:'
        return null if cfg.if_exists is 'ignore'
      throw new Error "when trying to `init` repo #{@cfg.repo_path}, an error occurred: #{error.message}"
    return null

  #---------------------------------------------------------------------------------------------------------
  _status: ->
    R = @ic.spawn 'fossil', 'status'
    return { error: R, } unless ( /^[^\s:]+:\s+\S+/ ).test R
    lines   = R.split '\n'
    entries = ( line.split /^([^:]+):\s+(.*)$/ for line in lines )
    return  Object.fromEntries ( [ k, v, ] for [ _, k, v, ] in entries when k? )

  #---------------------------------------------------------------------------------------------------------
  status: ->
    R = {}
    for k, v of @_status()
      switch k
        when 'repository' then R.repo_path      = v
        when 'local-root' then R.work_path  = v
        when 'config-db'  then R.cfg_path       = v
        when 'checkout', 'parent'
          unless ( g = ( v.match /^(?<id>[0-9a-f]+)\s+(?<ts>.+)$/ )?.groups )?
            throw new Error "^kaseki@1^ unable to parse ID with timestamp #{rpr v}"
          R[ "#{k}_id" ] = g.id
          R[ "#{k}_ts" ] = GUY.datetime.srts_from_isots g.ts
        when 'tags'       then R.tags           = v ### TAINT should split tags, return list ###
        when 'comment'
          if ( match = v.match /(?<message>^.*)\(user:\s+(?<user>\S+)\)$/ )?
            R.message     = match.groups.message.trim()
            R.user        = match.groups.user.trim()
          else
            R.message     = v
            R.user        = null
        else R[ k ] = v
    return R

#===========================================================================================================
do ->
  ### TAINT must translate commands that start with digit ###
  commands = [ '3-way-merge', 'add', 'addremove', 'alerts', 'all', 'amend', 'annotate', 'artifact',
    'attachment', 'backoffice', 'backup', 'bisect', 'blame', 'branch', 'bundle', 'cache', 'cat', 'cgi',
    'changes', 'chat', 'checkout', 'co', 'cherry-pick', 'clean', 'clone', 'close', 'commit', 'ci',
    'configuration', 'dbstat', 'deconstruct', 'delete', 'descendants', 'describe', 'detach', 'diff',
    'export', 'extras', 'finfo', 'forget', 'fts-config', 'fusefs', 'gdiff', 'git', 'grep', 'hash-policy',
    'help', 'hook', 'http', 'import', 'info', 'init', 'new', 'interwiki', 'leaves', 'login-group', 'ls',
    'md5sum', 'merge', 'merge-base', 'mv', 'open', 'patch', 'pikchr', 'praise', 'publish', 'pull', 'purge',
    'push', 'rebuild', 'reconstruct', 'redo', 'remote', 'remote-url', 'rename', 'reparent', 'revert', 'rm',
    'rss', 'scrub', 'search', 'server', 'settings', 'sha1sum', 'sha3sum', 'shell', 'sql', 'sqlar',
    'sqlite3', 'ssl-config', 'stash', 'status', 'sync', 'tag', 'tarball', 'ticket', 'timeline',
    'tls-config', 'touch', 'ui', 'undo', 'unpublished', 'unset', 'unversioned', 'uv', 'update', 'user',
    'version', 'whatis', 'wiki', 'xdiff', 'zip', ]
  for command in commands then do ( command ) =>
    raw_name            = "raw_#{command}"
    lns_name            = "lns_#{command}"
    Kaseki::[raw_name]  = ( P... ) -> @ic._spawn_inner 'fossil', [ command, ( _as_cli_parameters P... )..., ]
    Kaseki::[lns_name]  = ( P... ) -> @ic._as_lines @[raw_name] P...
  return null


#===========================================================================================================
class Git extends Kaseki

  #---------------------------------------------------------------------------------------------------------
  _git_init: ->      @ic._spawn_inner 'git', [ 'init', ]
  _git_status_sb: -> @ic._spawn_inner 'git', [ 'status', '-sb', ]

  #---------------------------------------------------------------------------------------------------------
  _add_and_commit_all: ( message = '???' ) ->
    @ic._spawn_inner 'git', [ 'add', '.', ]
    @ic._spawn_inner 'git', [ 'commit', '-m', message, ]

  #---------------------------------------------------------------------------------------------------------
  status: ->
    [ head
      tail..., ] = @ic._as_lines @_git_status_sb()
    R = @types.create.ksk_git_status_cfg()
    #.......................................................................................................
    if ( match = head.match /^## No commits yet on (?<local_branch>.*?)$/ )
      R.local_branch  = match.groups.local_branch
    #.......................................................................................................
    else if ( match = head.match /^##\s+(?<local_branch>.*?)\.\.\.(?<remote_branch>\S+).*$/ )
      R.local_branch  = match.groups.local_branch
      R.remote_branch = match.groups.remote_branch
    #.......................................................................................................
    else if ( match = head.match /^##\s+(?<local_branch>.*?)$/ )
      R.local_branch  = match.groups.local_branch
    #.......................................................................................................
    for line in tail
      R.dirty_count++ if /^(?<code>..)\x20(?<path>.+)$/.test line
    #.......................................................................................................
    return R






#===========================================================================================================
module.exports = { Kaseki, Fossil, Git, _as_cli_parameters, }

