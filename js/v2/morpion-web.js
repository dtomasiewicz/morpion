function loadRules(variant, callback) {
  $.getJSON('games/'+variant+'.json', callback);
}

function createGame(rules) {
	return new Morpion(rules['length'], rules['disjoint']).markAll(rules['marks']);
}

function drawGame(game, canvas) {
  
}