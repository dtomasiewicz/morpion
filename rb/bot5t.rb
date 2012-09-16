require 'json'
require_relative 'morpion'

def new_game(variant)
  rules = JSON.parse File.read("games/#{variant}.json")
  Morpion.new(rules['length'], rules['disjoint']).mark_all rules['marks']
end

# selects a random move
def select_naive(game)
  game.valid_moves.sample
end

# selects the move that leaves the most options available afterwards
def select_promising(game)
  max_score, max_moves = 0, []
  game.valid_moves.each do |move|
    game.mark *move
    n = g.valid_moves.length
    if n > max_score
      max_score, max_moves = n, [move]
    elsif n == max_score
      max_moves << move
    end
    game.unmark *move
  end
  max_moves.sample
end

# for each move, plays out random games and selects the move that produces
# the highest score on average
def select_performant(game, trials = 10)
  max_avg, max_move = 0, nil
  game.valid_moves.each do |move|
    scores = trials.times.map do
      game.mark *move
      n, moves = 0, [move]
      while m = select_naive(game)
        game.mark *m
        n += 1
        moves << m
      end
      game.unmark *moves.pop while moves.any?
      n
    end
    avg = scores.inject(:+).fdiv trials
    if avg > max_avg
      max_avg = avg
      max_move = move
    end
  end
  max_move
end

record = 0
loop do
  
  g = new_game '5T'
  moves = []
  while move = select_performant(g, 2)
    print "."
    g.mark *move
    moves << move
  end
  print "\n"

  n = moves.length
  puts "== #{n} =="
  if n > record
    record = n
    sig = moves.map do |x, y, (lx, ly, dx, dy)|
      "#{x},#{y}@#{lx},#{ly}[#{dx},#{dy}]"
    end.join ';'
    print "#{sig}\n\n"
  end

end

# each iteration, selects a promising move based on the score of a
# random game and adds it to the list.
=begin
best = []
loop do
  game = new_game '5t'
  best.each{|m| game.mark *m}
  
  max_score, max_move = 0, nil
  game.valid_moves.each do |move|
    game.mark *move
    score, moves = best.length+1, [move]
    while r = select_naive(game)
      game.mark *r
      score += 1
      moves << r
    end
    if score > max_score
      max_score = score
      max_move = move
    end
    game.unmark *moves.pop while moves.any?
  end

  if max_move
    best << max_move
    puts "selected"
  else
    break
  end
end

sig = best.map do |x, y, (lx, ly, dx, dy)|
  "#{x},#{y}@#{lx},#{ly}[#{dx},#{dy}]"
end.join ';'
puts "== #{best.length} ==\n#{sig}"
=end