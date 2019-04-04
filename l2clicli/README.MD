===Lineage II Command-Line Interface Client===
by Nartallax

Encapsulates all the difficulties with binary protocol of Lineage II, providing nice human-readable JSON interface on stdin/stdout.  
Tested on Chronicle 4, protocol version 656 (0x785a), no GameGuard.

=====How to use=====

0. See help by launching with -h or --help arguments.  
  Learn what arguments do you need to pass.
1. Get token and protocol version from the original client for selected server  
  You should probably use EngineExt or WalkerPatcher 3.0.6+
2. Get auth server host and port  
  You can decode l2.ini, or just spy with wireshark a little to see what host original client is connecting to.
3. Get server ID by launching without server ID argument - this will print a list of servers and their IDs.
  Alternatively, you could search in other .ini of original client and extract server list from there.
4. Launch with all required arguments.
  This should log the selected character into the game.
5. ???
6. PROFIT!

After launching, it will start to output incoming packages in JSON to stdout. First package will always be CharacterSelected - right after character actually entered the game.  
You can write packages in JSON into stdin, one on single line, and they will be sent to server.  
To learn about available package types, see packages/from_game_server.c and packages/to_game_server.c  
This client may not know how to decode some of the incoming packages from server. These packages will have type "Unknown" and their decoded binary content as hex (without length).  
The only package this client will handle itself is NetPing, to which it will respond automatically. The rest is on you.  
As you can see, this is not really client you can play with; more like client that allows you to base something bigger on top of it.  

=====Modification=====

This client is based mostly on knowledge from two pages, which I did put into ./docs. It's first thing you should see before modifications.