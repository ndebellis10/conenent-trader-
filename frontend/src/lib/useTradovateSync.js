import { useCallback } from 'react'
import { useTradovateStore } from '../store/tradovateStore'
import { useTradeStore } from '../store/tradeStore'
import { fetchFills, mapFillsToTrades } from './tradovateApi'
import toast from 'react-hot-toast'

export function useTradovateSync() {
  const {
    accessToken, environment, importedIds,
    setSyncing, setLastSync, setSyncError, addImportedIds,
  } = useTradovateStore()
  const { addTrade } = useTradeStore()

  return useCallback(async () => {
    if (!accessToken) return 0
    setSyncing(true)
    setSyncError(null)
    try {
      const fills = await fetchFills(accessToken, environment)
      const newTrades = mapFillsToTrades(fills, importedIds)
      for (const trade of newTrades) addTrade(trade)
      addImportedIds(newTrades.map(t => t.tradovateId).filter(Boolean))
      setLastSync(new Date().toISOString())
      if (newTrades.length > 0) {
        toast.success(`${newTrades.length} trade${newTrades.length > 1 ? 's' : ''} synced from Tradovate`)
      }
      return newTrades.length
    } catch (err) {
      setSyncError(err.message)
      toast.error('Sync failed: ' + err.message)
      return 0
    } finally {
      setSyncing(false)
    }
  }, [accessToken, environment, importedIds])
}
