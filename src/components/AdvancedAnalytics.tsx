'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Target, BarChart3, Activity } from 'lucide-react';
import { OpponentTrend, SeasonComparison, AdvancedMetrics } from '@/lib/services/advanced-analytics';

interface AdvancedAnalyticsProps {
  playerId: number;
  propType: string;
  season?: string;
}

interface AnalyticsData {
  opponentTrends: OpponentTrend[];
  seasonComparison: SeasonComparison;
  advancedMetrics: AdvancedMetrics;
}

export default function AdvancedAnalytics({ 
  playerId, 
  propType, 
  season = '2023-24' 
}: AdvancedAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Batch request for all analytics data
        const response = await fetch('/api/analytics/advanced', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              { type: 'opponent-trends', propType, season },
              { type: 'season-comparison', playerId, propType, season },
              { type: 'advanced-metrics', playerId, propType, season }
            ]
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const result = await response.json();
        
        if (result.results.some((r: any) => !r.success)) {
          throw new Error('Some analytics requests failed');
        }

        setData({
          opponentTrends: result.results[0].data,
          seasonComparison: result.results[1].data,
          advancedMetrics: result.results[2].data
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [playerId, propType, season]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            {error || 'Failed to load analytics data'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getConsistencyRating = (cv: number) => {
    if (cv < 20) return { rating: 'Excellent', color: 'bg-green-500' };
    if (cv < 30) return { rating: 'Good', color: 'bg-blue-500' };
    if (cv < 40) return { rating: 'Average', color: 'bg-yellow-500' };
    return { rating: 'Inconsistent', color: 'bg-red-500' };
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="opponents">Opponents</TabsTrigger>
          <TabsTrigger value="consistency">Consistency</TabsTrigger>
          <TabsTrigger value="momentum">Momentum</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Season Performance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Season Performance</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.seasonComparison.currentSeason.average}
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  {getTrendIcon(data.seasonComparison.currentSeason.trend)}
                  <span className={getTrendColor(data.seasonComparison.currentSeason.trend)}>
                    {data.seasonComparison.currentSeason.trend}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.seasonComparison.currentSeason.games} games played
                </div>
              </CardContent>
            </Card>

            {/* League Rank */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">League Percentile</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.seasonComparison.percentileRank}%
                </div>
                <Progress 
                  value={data.seasonComparison.percentileRank} 
                  className="mt-2" 
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Among all NBA players
                </div>
              </CardContent>
            </Card>

            {/* Consistency Rating */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consistency</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={`h-3 w-3 rounded-full ${
                    getConsistencyRating(data.advancedMetrics.consistency.coefficientOfVariation).color
                  }`}></div>
                  <span className="text-sm font-medium">
                    {getConsistencyRating(data.advancedMetrics.consistency.coefficientOfVariation).rating}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  CV: {data.advancedMetrics.consistency.coefficientOfVariation}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Streaks */}
          <Card>
            <CardHeader>
              <CardTitle>Current Form</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {data.advancedMetrics.consistency.streaks.currentStreak.count}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current {data.advancedMetrics.consistency.streaks.currentStreak.type} streak
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {data.advancedMetrics.momentum.hotStreak ? '🔥' : '❄️'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {data.advancedMetrics.momentum.hotStreak ? 'Hot streak' : 
                     data.advancedMetrics.momentum.coldStreak ? 'Cold streak' : 'Neutral'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {data.advancedMetrics.momentum.last5Trend > 0 ? '+' : ''}
                    {data.advancedMetrics.momentum.last5Trend}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Last 5 games trend
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opponents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Opponent Matchup Rankings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Teams ranked by average {propType.toUpperCase()} allowed (easiest to hardest matchups)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.opponentTrends.map((opponent, index) => (
                  <div 
                    key={opponent.opponentId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant={index < 10 ? "default" : index < 20 ? "secondary" : "destructive"}
                        className="w-8 h-6 flex items-center justify-center"
                      >
                        {opponent.rank}
                      </Badge>
                      <div>
                        <div className="font-medium">{opponent.opponentAbbreviation}</div>
                        <div className="text-sm text-muted-foreground">
                          {opponent.opponentName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{opponent.averageAllowed}</div>
                      <div className="text-xs text-muted-foreground">
                        {opponent.gamesPlayed} games
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consistency" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Statistical Consistency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Standard Deviation</span>
                    <span className="font-medium">
                      {data.advancedMetrics.consistency.standardDeviation}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Coefficient of Variation</span>
                    <span className="font-medium">
                      {data.advancedMetrics.consistency.coefficientOfVariation}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(data.advancedMetrics.consistency.coefficientOfVariation, 100)} 
                    className="mt-1" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Streak Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {data.advancedMetrics.consistency.streaks.longestOverStreak}
                    </div>
                    <div className="text-xs text-muted-foreground">Longest over streak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {data.advancedMetrics.consistency.streaks.longestUnderStreak}
                    </div>
                    <div className="text-xs text-muted-foreground">Longest under streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Season Periods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {data.advancedMetrics.situational.timeOfSeason.early.average}
                  </div>
                  <div className="text-sm text-muted-foreground">Early Season</div>
                  <div className="text-xs text-muted-foreground">
                    {data.advancedMetrics.situational.timeOfSeason.early.games} games
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {data.advancedMetrics.situational.timeOfSeason.mid.average}
                  </div>
                  <div className="text-sm text-muted-foreground">Mid Season</div>
                  <div className="text-xs text-muted-foreground">
                    {data.advancedMetrics.situational.timeOfSeason.mid.games} games
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {data.advancedMetrics.situational.timeOfSeason.late.average}
                  </div>
                  <div className="text-sm text-muted-foreground">Late Season</div>
                  <div className="text-xs text-muted-foreground">
                    {data.advancedMetrics.situational.timeOfSeason.late.games} games
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="momentum" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Last 5 Games Trend</span>
                  <div className="flex items-center space-x-2">
                    {data.advancedMetrics.momentum.last5Trend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : data.advancedMetrics.momentum.last5Trend < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-gray-600" />
                    )}
                    <span className="font-medium">
                      {data.advancedMetrics.momentum.last5Trend > 0 ? '+' : ''}
                      {data.advancedMetrics.momentum.last5Trend}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Last 10 Games Trend</span>
                  <div className="flex items-center space-x-2">
                    {data.advancedMetrics.momentum.last10Trend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : data.advancedMetrics.momentum.last10Trend < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-gray-600" />
                    )}
                    <span className="font-medium">
                      {data.advancedMetrics.momentum.last10Trend > 0 ? '+' : ''}
                      {data.advancedMetrics.momentum.last10Trend}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Form</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hot Streak</span>
                  <Badge variant={data.advancedMetrics.momentum.hotStreak ? "default" : "secondary"}>
                    {data.advancedMetrics.momentum.hotStreak ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cold Streak</span>
                  <Badge variant={data.advancedMetrics.momentum.coldStreak ? "destructive" : "secondary"}>
                    {data.advancedMetrics.momentum.coldStreak ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Hot/Cold streaks are determined by performance above/below average in 4 of the last 5 games.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}