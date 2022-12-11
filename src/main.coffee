
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
      throw new R.error if R.error?
      throw new Error R.stderr
    return R.stdout.replace /\n$/, ''

  #---------------------------------------------------------------------------------------------------------
  get_fossil_version_text: -> @_spawn 'fossil', 'version'

  #---------------------------------------------------------------------------------------------------------
  list_file_names:  -> ( @_spawn 'fossil', 'ls' ).split '\n'
  list_file_paths:  -> ( PATH.join @cfg.checkout_path, name for name in @list_file_names() )
  status_text:      -> @_spawn 'fossil', 'status'

  #---------------------------------------------------------------------------------------------------------
  fossil_status: ->
    ###
      repository: '/home/flow/3rd-party-repos/fossils/datamill-doc-demo.fossil',
      local-root: '/home/flow/3rd-party-repos/sqlite-archiver/demo/fossil-unpacked/',
      config-db:  '/home/flow/.config/fossil.db',
      checkout:   '56ae7533ba4c93de3e4cd54378e86019e04484d8 2022-12-11 10:58:54 UTC',
      parent:     'bce48ab77a9432b544577c2b200544bcfcfd2c9c 2022-12-11 10:55:57 UTC',
      tags:       'trunk',
      comment:    'first (user: flow)'
    ###
    R = @status_text()
    return { error: R, } unless ( /^[^\s:]+:\s+\S+/ ).test R
    lines   = R.split '\n'
    entries = ( line.split /^([^:]+):\s+(.*)$/ for line in lines )
    return  Object.fromEntries ( [ k, v, ] for [ _, k, v, ] in entries )

  #---------------------------------------------------------------------------------------------------------
  status: ->
    R = {}
    for k, v of @fossil_status()
      switch k
        when 'repository' then R.repo_path      = v
        when 'local-root' then R.checkout_path  = v
        when 'config-db'  then R.cfg_path       = v
        when 'checkout', 'parent'
          # '56ae7533ba4c93de3e4cd54378e86019e04484d8 2022-12-11 10:58:54 UTC',
          unless ( g = ( v.match /^(?<id>[0-9a-f]+)\s+(?<ts>.+)$/ )?.groups )?
            throw new Error "^kaseki@1^ unable to parse ID with timestamp #{rpr v}"
          R[ "#{k}_id" ] = g.id
          R[ "#{k}_ts" ] = GUY.datetime.srts_from_isots g.ts
        when 'tags'       then R.tags           = v ### TAINT should split tags, return list ###
        when 'comment'    then R.comment        = v ### TAINT should parse user name ###
        else R[ k ] = v
    return R

#===========================================================================================================
module.exports = { Kaseki, }


############################################################################################################
if module is require.main then do =>
  repo_path     = PATH.resolve PATH.join __dirname, '../../../3rd-party-repos/fossils/datamill-doc-demo.fossil'
  checkout_path = PATH.resolve PATH.join __dirname, '../../../3rd-party-repos/sqlite-archiver/demo/fossil-unpacked'
  ksk           = new Kaseki { repo_path, checkout_path, }
  info  '^345^', rpr ksk.get_fossil_version_text()
  debug '^345^', ksk._spawn 'ls', '-AlF', '.'
  debug '^345^', ksk._spawn 'realpath', '.'
  urge  '^345^', ksk._spawn 'fossil', 'ls'
  urge  '^345^', ksk.list_file_names()
  urge  '^345^', ksk.list_file_paths()
  urge  '^345^', ksk.status_text()
  urge  '^345^', ksk.fossil_status()
  help  '^345^', ksk.status()
  info  '^345^', ( k.padEnd 20 ), v for k, v of ksk.status()
  return null
