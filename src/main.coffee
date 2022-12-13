
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
    GUY.props.hide @, 'spawn_cfg',
      cwd:        @cfg.checkout_path
      encoding:   'utf-8'
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _spawn: ( cmd, parameters... ) -> @_spawn_inner cmd, parameters
  _spawn_inner: ( cmd, parameters, cfg = null ) ->
    cfg = if cfg? then { @spawn_cfg..., cfg..., } else @spawn_cfg
    R   = CP.spawnSync cmd, parameters, cfg
    if R.status isnt 0
      if R.error?
        cmd_line = cmd + ' ' + parameters.join ' '
        throw new Error "^kaseki@1^ when trying to execute #{rpr cmd_line} in directory #{cfg.cwd}," + \
          " an error occurred: #{R.error}"
      throw new Error R.stderr
    return R.stdout.replace /\n$/, ''

  #---------------------------------------------------------------------------------------------------------
  get_fossil_version_text: -> @_spawn 'fossil', 'version'

  #---------------------------------------------------------------------------------------------------------
  list_file_names:  -> ( ( @_spawn 'fossil', 'ls' ).split '\n' ).filter ( x ) -> x isnt ''
  list_file_paths:  -> ( PATH.join @cfg.checkout_path, name for name in @list_file_names() )
  open:             -> @_spawn 'fossil', 'open', @cfg.repo_path
  ls:               -> @list_file_names()
  change_texts:     -> ( ( @_spawn 'fossil', 'changes' ).split '\n' ).filter ( x ) -> x isnt ''
  has_changes:      -> @change_texts().length > 0
  list_of_changes:  -> ( [ t[ 11 .. ], t[ .. 10 ].trimEnd().toLowerCase(), ] for t in @change_texts() )
  changes_by_file:  -> Object.fromEntries @list_of_changes()
  #.........................................................................................................
  ### NOTE first arguments of the methods possibly to be made optional `cfg` objects ###
  add:              ( path    ) -> @_spawn 'fossil', 'add', path
  commit:           ( message ) -> @_spawn 'fossil', 'commit', '-m', message

  #---------------------------------------------------------------------------------------------------------
  init: ( cfg ) ->
    init = => @_spawn 'fossil', 'init', @cfg.repo_path
    cfg = @types.create.ksk_init_cfg cfg
    try init() catch error
      if error.message.startsWith 'file already exists:'
        return null if cfg.if_exists is 'ignore'
      throw new Error "when trying to `init` repo #{@cfg.repo_path}, an error occurred: #{error.message}"
    return null

  #---------------------------------------------------------------------------------------------------------
  _status: ->
    R = @_spawn 'fossil', 'status'
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
        when 'local-root' then R.checkout_path  = v
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
module.exports = { Kaseki, }


############################################################################################################
if module is require.main then do =>
  FS = require 'node:fs'
  GUY.temp.with_directory ({ path: repo_home, }) ->
    GUY.temp.with_directory ({ path: checkout_home, }) ->
      debug '^98-1^', rpr repo_home
      debug '^98-2^', rpr checkout_home
      repo_path     = PATH.join repo_home,     'kaseki-demo.fossil'
      checkout_path = PATH.join checkout_home
      ksk           = new Kaseki { repo_path, checkout_path, }
      info  '^98-3^', rpr ksk.get_fossil_version_text()
      urge  '^98-4^', ksk.init()
      urge  '^98-5^', ksk.init()
      try ksk.init { if_exists: 'error', } catch error then warn GUY.trm.reverse error.message
      urge  '^98-6^', ksk.open()
      urge  '^98-7^', ksk.list_file_names()
      urge  '^98-8^', ksk.list_file_paths()
      urge  '^98-9^', ksk.ls()
      #.....................................................................................................
      readme_path = PATH.join checkout_home, 'README.md'
      FS.writeFileSync readme_path, """
        # MyProject

        A fancy text explaing MyProject.
        """
      help  '^98-10^', rpr ksk._spawn 'fossil', 'changes'
      urge  '^98-11^', ksk.add readme_path
      urge  '^98-12^', ksk.commit "add README.md"
      urge  '^98-13^', ksk.list_file_names()
      #.....................................................................................................
      FS.appendFileSync readme_path, "\n\nhelo"
      strange_name = '  strange.txt'
      FS.appendFileSync ( PATH.join checkout_path, strange_name ), "\n\nhelo"
      help  '^98-14^', rpr ksk._spawn 'fossil', 'changes'
      help  '^98-15^', rpr ksk._spawn 'fossil', 'extras'
      help  '^98-16^', rpr ksk.add strange_name
      urge  '^98-17^', ksk.commit "add file with strange name"
      help  '^98-18^', rpr ksk.change_texts()
      #.....................................................................................................
      FS.appendFileSync ( PATH.join checkout_path, strange_name ), "\n\nhelo again"
      help  '^98-19^', rpr ksk.change_texts()
      help  '^98-19^', rpr ksk.list_of_changes()
      help  '^98-19^', rpr ksk.has_changes()
      help  '^98-19^', rpr ksk.changes_by_file()
      #.....................................................................................................
      urge  '^98-22^', ksk._status()
      help  '^98-23^', ksk.status()
      info  '^98-24^', ( k.padEnd 20 ), v for k, v of ksk.status()
      help  '^98-25^', ksk.list_file_names()
      urge  '^98-26^', FS.readdirSync repo_home
      urge  '^98-27^', FS.readdirSync checkout_home
      # urge  '^98-28^', FS.readFileSync ( PATH.join checkout_home, '.fslckout' ), { encoding: 'utf-8', }
  return null
