'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Upload, FileText, Sparkles } from 'lucide-react'
import type { AnalysisResult } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [jobDesc, setJobDesc] = useState('')
  const [resumeText, setResumeText] = useState<string>('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setResult(null)
    setResumeText('')
    const f = e.target.files?.[0] || null
    setFile(f)
  }

  async function parseFile(): Promise<string> {
    if (!file) {
      throw new Error('Please select a PDF or DOCX file.')
    }
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/parse', {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const msg = await res.text()
      throw new Error(msg || 'Failed to parse the file.')
    }
    const data = (await res.json()) as { text: string }
    return data.text
  }

  async function analyze(resumeTextValue: string) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeText: resumeTextValue,
        jobDescription: jobDesc,
      }),
    })
    if (!res.ok) {
      const msg = await res.text()
      throw new Error(msg || 'Failed to analyze the resume.')
    }
    const data = (await res.json()) as AnalysisResult
    return data
  }

  const handleAnalyze = async () => {
    setError(null)
    setIsParsing(true)
    setIsAnalyzing(false)
    setResult(null)
    try {
      const text = await parseFile()
      setResumeText(text)
    } catch (e: any) {
      setError(e?.message || 'Failed to parse the file.')
      setIsParsing(false)
      return
    }
    setIsParsing(false)

    if (!jobDesc.trim()) {
      setError('Please paste the job description.')
      return
    }

    setIsAnalyzing(true)
    try {
      const analysis = await analyze(resumeText || (await parseFile()))
      setResult(analysis)
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze the resume.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const score = result?.score ?? 0

  return (
    <main className="min-h-dvh bg-neutral-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Resume Parser & Screener</h1>
          <p className="text-neutral-600 mt-2">
            Upload a PDF or DOCX resume, add a job description, and get an AI-powered screening with a score and recommendations.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>1) Upload Resume & Paste Job Description</CardTitle>
              <CardDescription>PDF and DOCX are supported. Your file is parsed server-side for accurate text extraction.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label htmlFor="resume" className="block text-sm font-medium mb-2">
                  Resume file (PDF or DOCX)
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                  />
                  <Button variant="secondary" type="button" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
                {file && (
                  <div className="mt-2 text-sm text-neutral-600 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="truncate">{file.name}</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="jobDesc" className="block text-sm font-medium mb-2">
                  Job Description
                </label>
                <Textarea
                  id="jobDesc"
                  placeholder="Paste the target job description here..."
                  rows={8}
                  value={jobDesc}
                  onChange={(e) => {
                    setError(null)
                    setResult(null)
                    setJobDesc(e.target.value)
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleAnalyze}
                  disabled={isParsing || isAnalyzing || !file || !jobDesc.trim()}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isParsing ? 'Parsing...' : isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
                </Button>
                <span className="text-sm text-neutral-500">
                  {isParsing
                    ? 'Extracting text from your resume...'
                    : isAnalyzing
                    ? 'Evaluating with AI...'
                    : file && jobDesc
                    ? 'Ready to analyze.'
                    : 'Select a file and paste a job description.'}
                </span>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Something went wrong</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2) Score</CardTitle>
              <CardDescription>Overall match score between resume and the job description.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold tabular-nums">{score}</div>
                <div className={cn('text-sm font-medium', scoreColor(score))}>
                  {scoreLabel(score)}
                </div>
              </div>
              <Progress value={score} className="mt-4" />
              <p className="text-xs text-neutral-500 mt-2">0 to 100 (higher is better)</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Strengths</CardTitle>
              <CardDescription>Areas where the candidate aligns well.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {result?.strengths?.length ? (
                result.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant="secondary">Strength</Badge>
                    <p className="text-sm">{s}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-500">No strengths to display yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Missing Skills</CardTitle>
              <CardDescription>Important skills not clearly present in the resume.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {result?.missingSkills?.length ? (
                result.missingSkills.map((m, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant="destructive">Gap</Badge>
                    <p className="text-sm">{m}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-500">No missing skills to display yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Suggestions</CardTitle>
              <CardDescription>Actionable recommendations to improve the resume.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result?.suggestions?.length ? (
                result.suggestions.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Tip</Badge>
                      <p className="text-sm font-medium">{s}</p>
                    </div>
                    {i < (result.suggestions.length - 1) && <Separator className="my-2" />}
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-500">No suggestions to display yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {resumeText ? (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Parsed Resume Text</CardTitle>
                <CardDescription>This is the text extracted from your uploaded file.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-auto rounded border bg-white p-3 text-sm whitespace-pre-wrap">
                  {resumeText}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </main>
  )
}

function scoreLabel(score: number) {
  if (score >= 85) return 'Excellent match'
  if (score >= 70) return 'Strong match'
  if (score >= 55) return 'Moderate match'
  if (score >= 40) return 'Partial match'
  return 'Low match'
}

function scoreColor(score: number) {
  if (score >= 85) return 'text-green-600'
  if (score >= 70) return 'text-emerald-600'
  if (score >= 55) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}
