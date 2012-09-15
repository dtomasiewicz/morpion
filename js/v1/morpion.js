/*
  Morpion Solitaire Script
  Copyright 2010 Daniel Tomasiewicz <www.fourstaples.com>

  Feel free to modify/mirror, but please give credit where it is due. For more information
  about the game, visit www.morpionsolitaire.com.
*/

function empty(array) {
  for(key in array) {
    if(array[key] != undefined) {
      return false;
    }
  }
  return true;
}
function direction(x, y) {
  if(x == y) {
    return 'antidiagonal';
  } else if(x == -y) {
    return 'diagonal';
  } else if(x == 0) {
    return 'vertical';
  } else {
    return 'horizontal';
  }
}
function vector(dir) {
  if(dir == 'vertical') {
    return {'x':0,'y':-1};
  } else if(dir == 'horizontal') {
    return {'x':1,'y':0};
  } else if(dir == 'diagonal') {
    return {'x':1,'y':-1};
  } else if(dir == 'antidiagonal') {
    return {'x':1,'y':1};
  }
}

var game;
function Morpion(el) {
  this.variant = null;
  this.board = null;
  this.score = null;
  this.scoreboard = null;
  this.history = null;
  this.log = null;
  this.coords = null;
  this.table = null;
  this.el = el;
  this.size = null;
  this.lineSize = null;
  this.odd = null;
  this.validLines = null;
  this.showValidLines = false;
  this.showMoveNumber = false;
  this.separation = null;

  this.start = function(variant) {
    this.variant = variant;
    var mode = variant.substring(1);

    if(mode == 'D') {
      this.separation = 1;
    } else {
      this.separation = 0;
    }
    
    this.validLines = [];
    this.lineSize = parseInt(variant);
    this.size = this.lineSize-1;
    this.odd = this.lineSize % 2;
    this.board = new Grid(this.el, 2);


    if(!this.scoreboard) {
      this.scoreboard = document.createElement('div');
      this.scoreboard.className = 'morpion-score';
      this.el.appendChild(this.scoreboard);
    }

    if(!this.coords) {
      this.coords = document.createElement('div');
      this.coords.className = 'morpion-coords';
      this.el.appendChild(this.coords);
    }

    if(!this.log) {
      this.log = document.createElement('div');
      this.log.className = 'morpion-log';
      this.el.appendChild(this.log);
    }

    this.setScore(0);
    this.history = [];
    this.log.innerHTML = '';
    
    if(this.size == 4) {
      // Q1
      this.init([
        // Q1
        [3,3], [3,5], [3,7], [3,9], [1,9],
        [5,3], [7,3], [9,3], [9,1],
        // Q2
        [-3,3], [-3,5], [-3,7], [-3,9], [-1,9],
        [-5,3], [-7,3], [-9,3], [-9,1],
        // Q3
        [-3,-3], [-3,-5], [-3,-7], [-3,-9], [-1,-9],
        [-5,-3], [-7,-3], [-9,-3], [-9,-1],
        // Q4
        [3,-3], [3,-5], [3,-7], [3,-9], [1,-9],
        [5,-3], [7,-3], [9,-3], [9,-1]
      ]);
    } else {
      this.init([
        // Q1
        [2,2], [2,4], [2,6], [4,2], [6,2],
        // Q2
        [-2,2], [-2,4], [-2,6], [-4,2], [-6,2],
        // Q3
        [-2,-2], [-2,-4], [-2,-6], [-4,-2], [-6,-2],
        // Q4
        [2,-2], [2,-4], [2,-6], [4,-2], [6,-2],
        // between
        [0,6], [6,0], [-6,0], [0,-6]
      ]);
    }

    this.lines = {
      vertical: {},
      horizontal: {},
      diagonal: {},
      antidiagonal: {}
    };
    
    this.refreshValidLines();
  }
  
  this.init = function(points) {
    for(var i = 0; i < points.length; i++) {
      this.board.addPoint(points[i][0], points[i][1]);
    }
  }

  this.place = function(x, y, chosen) {
    // first check to make sure it creates at least one line
    var lines = this.getValidLines(x, y);

    for(dir in lines) {
      if(dir == 'total') {
        continue;
      }
      
      for(var i = 0; i < lines[dir].length; i++) {
        var line = lines[dir][i];
        line.length = this.lineSize;

        var draw = false;
        if(!chosen) {
          if(lines.total == 1) {
            draw = true;
          } else {
            line.length = this.lineSize;
            this.board.drawLine(line, 'temp');
            this.print();
            draw = confirm('Draw '+dir+' line starting from '+line.x+','+line.y+'?');
            this.board.deleteAll('temp');
          }
        } else if(chosen.x == line.x && chosen.y == line.y && direction(chosen.dx, chosen.dy) == dir) {
          draw = true;
        }

        if(draw) {
          if(!this.lines[dir][line.x]) {
            this.lines[dir][line.x] = {};
          }
                    
          this.lines[dir][line.x][line.y] = true;
          this.board.addPoint(x, y, this.history.length+1);
          this.board.drawLine(line, 'normal');
          this.increaseScore();
          this.addLog({
            x: x,
            y: y,
            direction: dir,
            linex: line.x,
            liney: line.y
          });
          
          return true;
        }
      }
    }
    
    return false;
  }

  // returns a list of valid lines created by the specified location
  this.getValidLines = function(x, y) {
    var lines = {};

    var rays = this.getRays(x, y);

    // check vertical
    lines.vertical = this.getValidStartPoints(x, y, 0, -1, rays);
    
    // check horizontal
    lines.horizontal = this.getValidStartPoints(x, y, 1, 0, rays);

    // check main diagonal
    lines.diagonal = this.getValidStartPoints(x, y, 1, -1, rays);

    // check anti diagonal
    lines.antidiagonal = this.getValidStartPoints(x, y, 1, 1, rays);

    lines.total = lines.vertical.length + lines.horizontal.length + lines.diagonal.length + lines.antidiagonal.length;

    return lines;
  }

  this.getValidStartPoints = function(x, y, dx, dy, rays) {
    var lines = [];
    var dir = direction(dx, dy);

    var yi = y+2*Math.min(rays[-dx][-dy], this.lineSize-1)*-dy;
    var xi = x+2*Math.min(rays[-dx][-dy], this.lineSize-1)*-dx;

    var stopx = x+2*Math.max(this.lineSize-rays[dx][dy]-1, 0)*-dx;
    var stopy = y+2*Math.max(this.lineSize-rays[dx][dy]-1, 0)*-dy;

    // loops through starting positions with complete lines, makes sure they don't overlap existing lines
    while(((dy == 1 && yi <= stopy) || (dy == -1 && yi >= stopy) || dy == 0) && ((dx == 1 && xi <= stopx) || (dx == -1 && xi >= stopx) || dx == 0)) {
      // xi, yi is a start point. test its validity
      var piecesBefore = rays[-dx][-dy]-Math.max(xi-x, yi-y)/2;
      var xii = xi+2*Math.min(piecesBefore, this.lineSize-2+this.separation)*-dx;
      var yii = yi+2*Math.min(piecesBefore, this.lineSize-2+this.separation)*-dy;

      var overlap = false;
      while((dy == 1 && yii <= yi || dy == -1 && yii >= yi || dy == 0) && (dx == 1 && xii <= xi || dx == -1 && xii >= xi || dx == 0)) {
        if(this.lines[dir][xii] && this.lines[dir][xii][yii]) {
          overlap = true;
        }
        xii += dx*2;
        yii += dy*2;
      }

      if(!overlap) {
        // ensure it doesn't overlap on the bottom
        for(var piecesAfter = 1; piecesAfter < this.lineSize-1+this.separation; piecesAfter++) {
          xii = xi+2*piecesAfter*dx;
          yii = yi+2*piecesAfter*dy;

          if(this.lines[dir][xii] && this.lines[dir][xii][yii]) {
            overlap = true;
          }
        }
      }

      if(!overlap) {
        lines.push({'x':xi,'y':yi,'dx':dx,'dy':dy});
      }
      
      xi += dx*2;
      yi += dy*2;
    }

    return lines;
    
  }

  // gets the lengths of the 8 rays extending from the specified location
  this.getRays = function(x, y) {
    var rays = [];
    rays[1] = [];
    rays[0] = [];
    rays[-1] = [];
    
    rays[0][0] = 0;
    rays[0][1] = this.rayLength(x, y, 0, 1);
    rays[1][1] = this.rayLength(x, y, 1, 1);
    rays[1][0] = this.rayLength(x, y, 1, 0);
    rays[1][-1] = this.rayLength(x, y, 1, -1);
    rays[0][-1] = this.rayLength(x, y, 0, -1);
    rays[-1][-1] = this.rayLength(x, y, -1, -1);
    rays[-1][0] = this.rayLength(x, y, -1, 0);
    rays[-1][1] = this.rayLength(x, y, -1, 1);

    return rays;
  }

  this.rayLength = function(x, y, dx, dy) {
    var length = 0;

    stop = false;
    while(!stop) {
      x += 2*dx;
      y += 2*dy;

      if(this.board.getPoint(x, y)) {
        length++;
      } else {
        stop = true;
      }
    }

    return length;
  }

  this.unplace = function(x, y) {
    this.board.deletePoint(x, y);
  }
  
  this.setScore = function(score) {
    this.score = score;
    this.refreshScoreboard();
  }

  this.increaseScore = function() {
    this.score++;
    this.refreshScoreboard();
  }

  this.decreaseScore = function() {
    this.score--;
    this.refreshScoreboard();
  }
  
  this.setCoords = function(x,y) {
    this.coords.innerHTML = 'Coords: '+x+','+y;
  }

  this.clearCoords = function() {
    this.coords.innerHTML = '';
  }

  this.refreshScoreboard = function() {
    this.scoreboard.innerHTML = 'Score: '+this.score;
  }

  this.addLog = function(item) {
    this.history.push(item);
  }
  
  this.refreshValidLines = function() {
    this.board.deleteAll('valid');

    if(this.showValidLines) {
      for(var x = this.board.xMin-2; x <= this.board.xMax+2; x++) {
        for(var y = this.board.yMin-2; y <= this.board.yMax+2; y++) {
          if(!this.board.getPoint(x,y)) {
            var lines = this.getValidLines(x,y);
          
            for(dir in lines) {
              if(dir == 'total') {
                continue;
              }
              for(var i = 0; i < lines[dir].length; i++) {
                var line = lines[dir][i];
                line.length = this.lineSize;
                this.board.drawLine(line, 'valid');
              }
            }
          }
        }
      }
    }
  }

  this.toggleValidLines = function(value) {
    this.showValidLines = value;
    this.refreshValidLines(); 
    this.print();
  }

  this.refreshLog = function() {
    var list = document.createElement('ol');
    for(var i = 0; i < this.history.length; i++) {
      var item = document.createElement('li');
      item.innerHTML = 'Played '+this.history[i].x+','+this.history[i].y+'; '+this.history[i].direction+' line starting at '+
        this.history[i].linex+','+this.history[i].liney+' ( <a href="#" onclick="game.undo('+(this.history.length-i)+');return false">undo</a> )';
      list.appendChild(item);
    }
    if(this.log.childNodes[0]) {
      this.log.removeChild(this.log.childNodes[0]);
    }
    this.log.appendChild(list);
    this.log.scrollTop = this.log.scrollHeight;
  }

  this.undo = function(n) {
    if(!n) {
      n = 1;
    }
    
    for(var i = 0; i < n; i++) {
      var history = this.history.pop();
      if(history) {
        this.decreaseScore();
        // delete point
        this.board.deletePoint(history.x, history.y);
        // delete line start point
        this.lines[history.direction][history.linex][history.liney] = null;
        // delete line
        this.board.deleteLast('normal');
      }
    }
    
    this.refreshValidLines();
    this.print();
    this.refreshLog();
  }

  this.toggleGridlines = function(value) {
    this.el.className = value?'':'nogridlines';
  }

  this.toggleShowNumber = function(value) {
    this.showMoveNumber = value;
  }

  this.exportGame = function() {
    var str = this.variant+';';
    
    for(var i = 0; i < this.history.length; i++) {
      var point = this.history[i];
      var vec = vector(point['direction']);
      str += point.x+','+point.y+','+point.linex+','+point.liney+','+vec.x+','+vec.y+';';
    }
    
    return str.substring(0, str.length-1);
  }

  this.importGame = function(str) {
    var moves = str.split(';');
    this.start(moves[0]);

    for(var i = 1; i < moves.length; i++) {
      var components = moves[i].split(',');
      var line = {'x':parseInt(components[2]),'y':parseInt(components[3]),'dx':parseInt(components[4]),'dy':parseInt(components[5])};
      if(!this.place(parseInt(components[0]), parseInt(components[1]), line)) {
        alert('Import failed!');
        break;
      }
    }

    this.refreshValidLines();
    this.print();
    this.refreshLog();
  }

  this.print = function() {
    var pointForm = this.showMoveNumber ? '<span class="moveNum">%val</span>' : 'X';
    var table = this.board.asTable('<span class="grid-empty" onclick="game.place(%x, %y); game.refreshValidLines(); game.print(); game.refreshLog()" onmouseover="game.setCoords(%x, %y)" onmouseout="game.clearCoords()"></span>', 2, this.odd, pointForm);
    if(this.table) {
      this.el.removeChild(this.table);
    }
    this.table = table;
    this.el.insertBefore(this.table, this.log);
  }
}

function Grid(el, scale) {
  this.el = el;
  this.scale = scale;
  this.lines = {
    normal: [],
    temp: [],
    valid: []
  };
  this.data = {};
  this.xMin = 0;
  this.xMax = 0;
  this.yMin = 0;
  this.yMax = 0;
  this.lastNormal = -1;
  
  this.getPoint = function(x, y) {
    if(this.data[x] != undefined && this.data[x][y] != undefined) {
      return this.data[x][y];
    } else {
      return null;
    }
  }
  
  this.addPoint = function(x, y, value) {
    if(value == undefined) {
      value = true;
    }
    
    // adjust x bounds if outside of current dimensions
    while(this.xMin > x) {
      this.data[--this.xMin] = {};
    }
    while(this.xMax < x) {
      this.data[++this.xMax] = {};
    }

    // adjust y bounds if outside of current dimensions
    while(this.yMin > y) {
      this.yMin--;
    }
    while(this.yMax < y) {
      this.yMax++;
    }
    

    this.data[x][y] = value;
  }

  this.deletePoint = function(x, y) {
    // unsetting, remove and adjust bounds
    this.data[x][y] = null;
    this.correctBounds();
  }

  this.correctBounds = function() {   
    // remove column if empty and on an edge
    while(this.xMin < 0 && empty(this.data[this.xMin])) {
      this.xMin++;
    }
    while(this.xMax > 0 && empty(this.data[this.xMax])) {
      this.xMax--;
    }
    
    var found;
    
    // remove row if empty and on an edge
    found = false;    
    while(this.yMin < 0 && !found) {
      for(var c = this.xMin; c <= this.xMax && !found; c++) {
        if(this.data[c] != undefined && this.data[c][this.yMin] != undefined) {
          found = true;
        }
      }
      if(!found) {
        this.yMin++;
      }
    }

    found = false;    
    while(this.yMax > 0 && !found) {
      for(var c = this.xMin; c <= this.xMax && !found; c++) {
        if(this.data[c] != undefined && this.data[c][this.yMax] != undefined) {
          found = true;
        }
      }
      if(!found) {
        this.yMax--;
      }
    }
  }

  this.drawLine = function(line, className) {
    //alert(line.x+', '+line.y+', '+line.dx+', '+line.dy+', '+line.length+', '+line.className);
    this.lines[className].push(line);
  }
  
  this.deleteAll = function(className) {
    this.lines[className] = [];
  }
  
  this.deleteLast = function(className) {
    return this.lines[className].pop();
  }

  // creates a DOM table representation of the data
  this.asTable = function(empty, padding, mod, pointForm) {
    var table = document.createElement('div');
    table.className = 'grid';

    var cells = [];

    for(var y = this.yMax+padding*this.scale; y >= this.yMin-padding*this.scale; y--) {
      if(mod === false || Math.abs(y % this.scale) == mod) {
        row = document.createElement('div');
        row.className='grid-row';

        table.appendChild(row);
  
        for(var x = this.xMin-padding*2; x <= this.xMax+padding*this.scale; x++) {
          if(mod === false || Math.abs(x % this.scale) == mod) {
            var cell = document.createElement('div');
            cell.className = 'grid-cell';

            row.appendChild(cell);
            
            if(!cells[x]) {
              cells[x] = [];
            }


            cells[x][y] = cell;

            var pointValue = this.getPoint(x, y);
            if(pointValue != null) {
              if(pointValue === true) {
                cell.innerHTML += '<span class="grid-defaultPoint">X</span>';
              } else if(pointForm) {
                cell.innerHTML = pointForm.replace('%val', pointValue);
              } else {
                cell.innerHTML = pointValue;
              }
            } else {
              cell.innerHTML = empty.replace(/\%x/g, x).replace(/\%y/g, y);
            }
          }
        }

        var clear = document.createElement('div');
        clear.className = 'clear';
        row.appendChild(clear);
      }
    }

    //this.cells = cells;

    // add lines
    for(var className in this.lines) {
      for(var i = 0; i < this.lines[className].length; i++) {
        var line = this.lines[className][i];
        var last = i == this.lines[className].length-1;
        for(var length = 0; length < line.length; length++) {
          var marker = document.createElement('div');
          marker.className = 'grid-line grid-line-'+className;
          if(last) {
            marker.className += ' grid-line-last';
          }
          
          marker.className += ' grid-line-';
          if(length == 0) {
            marker.className += line.dx+'-'+line.dy;
          } else if(length == line.length-1) {
            marker.className += (-line.dx)+'-'+(-line.dy);
          } else {
            marker.className += direction(line.dx, line.dy);
          }
        
          cells[line.x+line.dx*length*this.scale][line.y+line.dy*length*this.scale].appendChild(marker);
        }
      }
    }

    return table;
  }
}