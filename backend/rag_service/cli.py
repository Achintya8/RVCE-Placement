import sys
import json
import argparse
from dotenv import load_dotenv
load_dotenv()

from rag_engine import (
    init_pgvector_db,
    split_resume_text,
    store_resume_chunks,
    evaluate_resume_vs_jd,
    batch_evaluate_candidates_for_jd
)

def main():
    parser = argparse.ArgumentParser(description="Python RAG Engine CLI for Resume-JD Matching & Candidate Ranking")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Init DB command
    init_parser = subparsers.add_parser("init-db", help="Initialize pgvector extension & tables")

    # Embed command
    embed_parser = subparsers.add_parser("embed", help="Chunk and embed candidate resume")
    embed_parser.add_argument("--student-id", type=int, required=True)
    embed_parser.add_argument("--text", type=str, required=True)
    embed_parser.add_argument("--meta", type=str, default="{}")

    # Match command
    match_parser = subparsers.add_parser("match", help="Match single candidate resume with Job Description")
    match_parser.add_argument("--student-id", type=int, required=True)
    match_parser.add_argument("--jd", type=str, required=True)
    match_parser.add_argument("--top-k", type=int, default=5)

    # Batch Match command
    batch_parser = subparsers.add_parser("batch-match", help="Rank all candidates matching skills in Job Description")
    batch_parser.add_argument("--jd", type=str, required=True)
    batch_parser.add_argument("--top-n", type=int, default=10)

    args = parser.parse_args()

    if args.command == "init-db":
        init_pgvector_db()
        print(json.dumps({"success": True, "message": "Database initialized"}))

    elif args.command == "embed":
        init_pgvector_db()
        chunks = split_resume_text(args.text, chunk_size=800, chunk_overlap=150)
        meta = json.loads(args.meta)
        count = store_resume_chunks(args.student_id, chunks, meta)
        print(json.dumps({
            "success": True,
            "studentId": args.student_id,
            "chunksStored": count,
            "message": f"Successfully stored {count} vector chunks for student {args.student_id}"
        }))

    elif args.command == "match":
        init_pgvector_db()
        result = evaluate_resume_vs_jd(args.student_id, args.jd, top_k=args.top_k)
        print(json.dumps({
            "success": True,
            "studentId": args.student_id,
            "retrievedChunksCount": result["retrieved_chunks_count"],
            "analysis": result["analysis"]
        }))

    elif args.command == "batch-match":
        init_pgvector_db()
        result = batch_evaluate_candidates_for_jd(args.jd, top_n=args.top_n)
        print(json.dumps({
            "success": True,
            "jobDescription": result["jobDescription"],
            "totalEvaluated": result["totalEvaluated"],
            "candidates": result["candidates"]
        }))

if __name__ == "__main__":
    main()
