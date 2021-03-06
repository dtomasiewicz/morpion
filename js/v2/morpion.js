var Morpion = function(len, dis) {
  this.len = len;
  this.dis = dis;
  this.data = {};
  this.bound = {};
};


Morpion.ORIENTATIONS = [
  [1, 0],  // horiz
  [0, 1],  // vert
  [1, -1], // asec
  [1, 1]   // desc
];

Morpion.prototype = {

  mark: function(x, y, line) {
    // add mark and remove it from the boundary
    this.data[[x, y]] = {};
    delete this.bound[[x, y]];

    // add all non-marked surrounding points to boundary
    this._drawBound(x, y);

    if(line) {
      this._drawLine.apply(this, line);
    }

    return this;
  },

  unmark: function(x, y, line) {
    // first: clear line
    if(line) {
      this._clearLine.apply(this, line);
    }

    // remove mark
    delete this.data[[x, y]];

    // correct boundary status of this and all surrounding points
    for(var bx = x-1; bx <= x+1; bx++) {
      for(var by = y-1; by <= y+1; by++) {
        this._correctBound(bx, by);
      }
    }

    return this;
  },

  markSafe: function(x, y, line) {
    var valid = this.validMoves();
    for(var i = 0; i < valid.length; i++) {
      if(valid[i].join(',') == [x, y, line].join(',')) {
        this.mark(x, y, line);
        return this;
      }
    }
    throw "Invalid move: "+x+","+y+" ("+line+")";
  },

  markAll: function(marks) {
    for(var i = 0; i < marks.length; i++) {
      this.mark.apply(this, marks[i]);
    }
    return this;
  },

  validMoves: function() {
    var moves = [];
    for(var b in this.bound) {
      var bx = this.bound[b][0], by = this.bound[b][1];
      this.lines(bx, by).forEach(function(line) {
        moves.push([bx, by, line]);
      });
    }
    return moves;
  },

  lines: function(x, y) {
    var game = this;
    var lines = [];

    Morpion.ORIENTATIONS.forEach(function(d) {
      var dx = d[0], dy = d[1];

      // adj = [ahead, behind]
      var adj = [-1, 1].map(function(dir) {
        var nAdj = 0, cont = true, p;

        for(var i = 1; i <= game.len+game.dis; i++) {
          var p = [x+i*dx*dir, y+i*dy*dir];
          if(p in game.data) {
            if(cont) {
              nAdj++;
            }
            if(d in game.data[p]) {
              nAdj = Math.min(i-game.dis, nAdj);
              break;
            }
          } else {
            cont = false;
          }
        }

        return Math.min(game.len, nAdj);
      });

      for(var i = -adj[0]; i <= adj[1]-game.len; i++) {
        lines.push([x+i*dx, y+i*dy, dx, dy]);
      }
    });

    return lines;
  },

  isPlayed: function(x, y) {
    return [x, y] in this.data;
  },

  _drawBound: function(x, y) {
    for(var bx = x-1; bx <= x+1; bx++) {
      for(var by = y-1; by <= y+1; by++) {
        if(bx == x && by == y) {
          continue;
        } else if(!([bx, by] in this.data)) {
          this.bound[[bx, by]] = [bx, by];
        }
      }
    }
  },

  _correctBound: function(x, y) {
    if(!([x, y] in this.data)) {
      for(var bx = x-1; bx <= x+1; bx++) {
        for(var by = y-1; by <= y+1; by++) {
          if([bx, by] in this.data) {
            this.bound[[x, y]] = [x, y];
            return;
          }
        }
      }
    }
    delete this.bound[[x, y]];
  },

  _drawLine: function(x, y, dx, dy) {
    for(var i = 0; i <= this.len; i++) {
      var xi = x+i*dx, yi = y+i*dy;
      if(!([dx, dy] in this.data[[xi, yi]])) {
        this.data[[xi, yi]][[dx, dy]] = [];
      }
      this.data[[xi, yi]][[dx, dy]].push([x, y]);
    }
  },

  // clears the most recently added line (not any arbitrary line!)
  _clearLine: function(x, y, dx, dy) {
    for(var i = 0; i <= this.len; i++) {
      var xi = x+i*dx, yi = y+i*dy;
      var lines = this.data[[xi, yi]][[dx, dy]];
      for(var l = 0; l < lines.length; l++) {
        if(lines[l][0] == x && lines[l][1] == y) {
          lines.splice(l, 1);
          break;
        }
      }
      if(lines.length == 0) {
        delete this.data[[xi, yi]][[dx, dy]];
      }
    }
  }

};