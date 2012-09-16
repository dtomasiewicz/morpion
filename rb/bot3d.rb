require 'json'
require_relative 'morpion'

def new_game(variant)
  rules = JSON.parse File.read("games/#{variant}.json")
  Morpion.new(rules['length'], rules['disjoint']).mark_all rules['marks']
end

BAD = {}

def select(game, limit)
  return nil if limit == 0

  best = nil, moves = nil

  game.valid_moves.each do |m|
    game.mark *m
    unless BAD[game.id]
      if recurse = select(game, limit-1)
        if !best || best > recurse.length+1
          best = recurse.length+1
          moves = [m, *recurse]
        end
      else
        #puts "memoizing bad game"
        BAD[game.id] = true
      end
    end
    game.unmark *m
  end

  moves
end

game = new_game '3D'
if solution = select(game, 5)
  sig = solution.map do |x, y, (lx, ly, dx, dy)|
    "#{x},#{y}@#{lx},#{ly}[#{dx},#{dy}]"
  end.join ';'
  print "== #{solution.length} ==\n#{sig}\n\n"
else
  puts "nothing"
end
