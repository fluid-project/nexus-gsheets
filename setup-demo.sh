# TODO: take nexus server location as an argument
# TODO: only start a nexus server if one isn't already running

# start nexus server
cd ../infusion-nexus/
vagrant up
# set up a cell on the nexus server
cd ../infusion-nexus-gsheets
node constructNexusPeers.js