
'use strict'


############################################################################################################
GUY                       = require 'guy'
{ debug }                 = GUY.trm.get_loggers 'KASEKI/TYPES'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
{ Intertype }             = require 'intertype'
base_types                = null
kaseki_types              = null
misfit                    = Symbol 'misfit'


#-----------------------------------------------------------------------------------------------------------
get_base_types = ->
  return base_types if base_types?
  #.........................................................................................................
  base_types                = new Intertype()
  { declare }               = base_types
  #.........................................................................................................
  # declare.dbay                  override: true, isa: ( x ) -> x?.constructor?.name is 'DBay'
  # declare.dbay_prefix                           isa: ( x ) -> ( @isa.text x ) and ( x.endsWith '_' )
  #.........................................................................................................
  return base_types

#-----------------------------------------------------------------------------------------------------------
get_kaseki_types = ->
  return kaseki_types if kaseki_types?
  #.........................................................................................................
  kaseki_types                = new Intertype get_base_types()
  { declare }                 = kaseki_types
  #.........................................................................................................
  declare.ksk_constructor_cfg
    fields:
      repo_path:          'nonempty.text'
      checkout_path:      'nonempty.text'
    default:
      repo_path:          null
      checkout_path:      null
  #.........................................................................................................
  declare.ksk_ignore_or_error ( x ) -> x in [ 'ignore', 'error', ]
  #.........................................................................................................
  declare.ksk_init_cfg
    fields:
      if_exists:          'ksk_ignore_or_error'
    default:
      if_exists:          'ignore'
  #.........................................................................................................
  # declare.ksk_spawn_cfg
    # fields:
      # cwd:                      # <string> | <URL> Current working directory of the child process.
      # input:                    # <string> | <Buffer> | <TypedArray> | <DataView> The value which will be passed as stdin to the spawned process. Supplying this value will override stdio[0].
      # argv0:                    # <string> Explicitly set the value of argv[0] sent to the child process. This will be set to command if not specified.
      # stdio:                    # <string> | <Array> Child's stdio configuration.
      # env:                      # <Object> Environment key-value pairs. Default: process.env.
      # uid:                      # <number> Sets the user identity of the process (see setuid(2)).
      # gid:                      # <number> Sets the group identity of the process (see setgid(2)).
      # timeout:                  # <number> In milliseconds the maximum amount of time the process is allowed to run. Default: undefined.
      # killSignal:               # <string> | <integer> The signal value to be used when the spawned process will be killed. Default: 'SIGTERM'.
      # maxBuffer:                # <number> Largest amount of data in bytes allowed on stdout or stderr. If exceeded, the child process is terminated and any output is truncated. See caveat at maxBuffer and Unicode. Default: 1024 * 1024.
      # encoding:                 # <string> The encoding used for all stdio inputs and outputs. Default: 'buffer'.
      # shell:                    # <boolean> | <string> If true, runs command inside of a shell. Uses '/bin/sh' on Unix, and process.env.ComSpec on Windows. A different shell can be specified as a string. See Shell requirements and Default Windows shell. Default: false (no shell).
      # windowsVerbatimArguments: # <boolean> No quoting or escaping of arguments is done on Windows. Ignored on Unix. This is set to true automatically when shell is specified and is CMD. Default: false.
      # windowsHide:              # <boolean> Hide the subprocess console window that would normally be created on Windows systems. Default: false.


  #     paths:
  #       public:     PATH.resolve __dirname, '../public'
  #       favicon:    PATH.resolve __dirname, '../public/favicon.png'
  #       src:        PATH.resolve __dirname, '../src'
  #     file_server:
  #       # Enable or disable accepting ranged requests. Disabling this will not send Accept-Ranges and ignore the
  #       # contents of the Range request header. defaults to true.
  #       acceptRanges:     true
  #       # Set Cache-Control response header, defaults to undefined, see docs: Cache-Control in MDN.
  #       cacheControl:     undefined
  #       # Enable or disable etag generation, defaults to true.
  #       etag:             true
  #       # Enable or disable Last-Modified header, defaults to true. Uses the file system's last modified value.
  #       # defaults to true.
  #       lastModified:     true
  #       # Set ignore rules. defaults to undefined. ( path ) => boolean
  #       ignore:           undefined
  #       # If true, serves after await next(), allowing any downstream middleware to respond first. defaults to false.
  #       defer:            false
  #...........................................................................................................
  return kaseki_types

module.exports = { misfit, get_base_types, get_kaseki_types, }


