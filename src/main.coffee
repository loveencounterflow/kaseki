
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

